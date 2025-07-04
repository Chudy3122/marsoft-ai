// src/components/KnowledgeLibraryPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { Document } from '@/types/knowledge';
import UserUploadDocumentForm from './UserUploadDocumentForm';
import CreateCategoryForm from './CreateCategoryForm';

interface KnowledgeLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentChatId: string | null;
  selectedDocumentIds: string[];
  onApply: (documentIds: string[]) => void;
}

export default function KnowledgeLibraryPanel({
  isOpen,
  onClose,
  currentChatId,
  selectedDocumentIds,
  onApply
}: KnowledgeLibraryPanelProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(selectedDocumentIds);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'my'>('all');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentCategoryOwner, setCurrentCategoryOwner] = useState<boolean>(false);

  // Funkcja odświeżająca kategorie po dodaniu nowej
  const handleCategoryAdded = () => {
    fetchCategories();
  };

  // Funkcja odświeżająca dokumenty po dodaniu nowego
  const handleDocumentAdded = () => {
    if (selectedCategory) {
      fetchDocuments(selectedCategory);
    }
  };

  // Funkcja do sprawdzania dostępu do kategorii
  const checkCategoryAccess = async (categoryId: string, category: any) => {
    // Jeśli kategoria nie ma hasła lub użytkownik jest właścicielem
    if (!category.hasPassword || category.isOwner) {
      setSelectedCategory(categoryId);
      return;
    }

    // Poproś o hasło
    const password = prompt(`Kategoria "${category.name}" jest chroniona hasłem.\nPodaj hasło:`);
    
    if (!password) {
      return; // Anulowano
    }

    try {
      const response = await fetch(`/api/knowledge/categories/${categoryId}/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setSelectedCategory(categoryId);
      } else {
        const error = await response.json();
        alert(`Błąd: ${error.error}`);
      }
    } catch (error) {
      console.error('Błąd podczas weryfikacji hasła:', error);
      alert('Wystąpił błąd podczas weryfikacji hasła');
    }
  };

  // Funkcja usuwania kategorii
  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    // Potwierdzenie usunięcia
    const confirmDelete = confirm(
      `Czy na pewno chcesz usunąć kategorię "${categoryName}"?\n\n` +
      `⚠️ UWAGA: Ta operacja jest nieodwracalna!\n` +
      `Kategoria zostanie usunięta wraz ze wszystkimi dokumentami w niej zawartymi.`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      console.log(`🗑️ Usuwanie kategorii: ${categoryId}`);
      
      const response = await fetch(`/api/knowledge/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas usuwania kategorii');
      }

      const result = await response.json();
      console.log('✅ Kategoria usunięta pomyślnie:', result);

      // Odśwież listę kategorii
      await fetchCategories();
      
      // Jeśli usunięto aktualnie wybraną kategorię, wyczyść wybór
      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
        setDocuments([]);
      }

      // Pokaż komunikat o sukcesie
      alert(`Kategoria "${categoryName}" została pomyślnie usunięta.`);

    } catch (error) {
      console.error('❌ Błąd podczas usuwania kategorii:', error);
      alert(`Błąd podczas usuwania kategorii: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  // Funkcja usuwania dokumentu
  const handleDeleteDocument = async (documentId: string, documentTitle: string) => {
    // Potwierdzenie usunięcia
    const confirmDelete = confirm(
      `Czy na pewno chcesz usunąć dokument "${documentTitle}"?\n\n` +
      `⚠️ UWAGA: Ta operacja jest nieodwracalna!\n` +
      `Dokument zostanie trwale usunięty z serwera.`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      console.log(`🗑️ Usuwanie dokumentu: ${documentId}`);
      
      const response = await fetch(`/api/knowledge/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas usuwania dokumentu');
      }

      const result = await response.json();
      console.log('✅ Dokument usunięty pomyślnie:', result);

      // Odśwież listę dokumentów w aktualnej kategorii
      if (selectedCategory) {
        await fetchDocuments(selectedCategory);
      }

      // Usuń dokument z listy wybranych jeśli był wybrany
      if (selectedDocIds.includes(documentId)) {
        setSelectedDocIds(selectedDocIds.filter(id => id !== documentId));
      }

    } catch (error) {
      console.error('❌ Błąd podczas usuwania dokumentu:', error);
      alert(`Błąd podczas usuwania dokumentu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  // Pobieranie kategorii
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      // Pobierz email użytkownika z sesji (można to zrobić przez API call)
      fetch('/api/auth/session')
        .then(res => res.json())
        .then(data => {
          if (data.user?.email) {
            setCurrentUserEmail(data.user.email);
          }
        })
        .catch(err => console.warn('Nie udało się pobrać danych sesji'));
    }
  }, [isOpen]);

  // Pobieranie dokumentów, gdy wybrano kategorię lub zmieniono tryb wyświetlania
  useEffect(() => {
    if (selectedCategory) {
      fetchDocuments(selectedCategory);
      // Sprawdź czy użytkownik jest właścicielem wybranej kategorii
      const category = categories.find(cat => cat.id === selectedCategory);
      setCurrentCategoryOwner(category?.isOwner || false);
    }
  }, [selectedCategory, viewMode, categories]);

  const fetchCategories = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Pobieranie kategorii...");
      const response = await fetch('/api/knowledge/categories');
      console.log("Status odpowiedzi:", response.status);
      
      if (!response.ok) {
        throw new Error(`Błąd HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Pobrano kategorie:", data);
      
      setCategories(data.categories || []);
      
      // Jeśli są kategorie, wybierz pierwszą
      if (data.categories && data.categories.length > 0) {
        setSelectedCategory(data.categories[0].id);
      }
    } catch (error) {
      console.error('Błąd podczas pobierania kategorii:', error);
      setError('Nie udało się pobrać kategorii. Spróbuj odświeżyć stronę.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocuments = async (categoryId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Pobieranie dokumentów dla kategorii:", categoryId);
      const url = `/api/knowledge/documents?categoryId=${categoryId}${viewMode === 'my' ? '&onlyMy=true' : ''}`;
      const response = await fetch(url);
      console.log("Status odpowiedzi:", response.status);
      
      if (!response.ok) {
        throw new Error(`Błąd HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Pobrano dokumenty:", data);
      
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Błąd podczas pobierania dokumentów:', error);
      setError('Nie udało się pobrać dokumentów. Spróbuj odświeżyć stronę.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentToggle = (documentId: string) => {
    if (selectedDocIds.includes(documentId)) {
      setSelectedDocIds(selectedDocIds.filter(id => id !== documentId));
    } else {
      setSelectedDocIds([...selectedDocIds, documentId]);
    }
  };

  const handleApply = async () => {
    if (!currentChatId) return;
    
    try {
      console.log("Zapisywanie dokumentów dla czatu:", currentChatId);
      const response = await fetch(`/api/chats/${currentChatId}/documents`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentIds: selectedDocIds })
      });
      
      if (!response.ok) {
        throw new Error(`Błąd HTTP: ${response.status}`);
      }
      
      onApply(selectedDocIds);
      onClose();
    } catch (error) {
      console.error('Błąd podczas zapisywania wybranych dokumentów:', error);
      setError('Nie udało się zapisać wybranych dokumentów.');
    }
  };

  const getDocumentIcon = (fileType: string) => {
    switch(fileType.toLowerCase()) {
      case 'pdf':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a3cd39" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        );
      case 'excel':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a3cd39" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a3cd39" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        );
    }
  };

  // Filtrowanie dokumentów po wyszukiwaniu
  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes networkFlow {
          0% { 
            transform: translateX(-100px) translateY(-50px) scale(0);
            opacity: 0;
          }
          50% { 
            opacity: 1;
            transform: translateX(50vw) translateY(0px) scale(1);
          }
          100% { 
            transform: translateX(100vw) translateY(50px) scale(0);
            opacity: 0;
          }
        }
        
        @keyframes aiPulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.3;
          }
          50% { 
            transform: scale(1.2);
            opacity: 0.8;
          }
        }
        
        @keyframes circuitTrace {
          0% { stroke-dashoffset: 1000; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }

        .library-container {
          animation: slideInUp 0.6s ease-out;
        }
        
        .category-item {
          animation: fadeInUp 0.4s ease-out forwards;
          opacity: 0;
        }
        
        .category-item:nth-child(1) { animation-delay: 0.1s; }
        .category-item:nth-child(2) { animation-delay: 0.15s; }
        .category-item:nth-child(3) { animation-delay: 0.2s; }
        .category-item:nth-child(4) { animation-delay: 0.25s; }
        .category-item:nth-child(5) { animation-delay: 0.3s; }
        
        .document-item {
          animation: fadeInUp 0.4s ease-out forwards;
          opacity: 0;
        }
        
        .document-item:nth-child(1) { animation-delay: 0.1s; }
        .document-item:nth-child(2) { animation-delay: 0.15s; }
        .document-item:nth-child(3) { animation-delay: 0.2s; }
        .document-item:nth-child(4) { animation-delay: 0.25s; }
        .document-item:nth-child(5) { animation-delay: 0.3s; }
        
        .ai-particle {
          animation: networkFlow 8s ease-in-out infinite;
        }
        
        .ai-particle:nth-child(1) { animation-delay: 0s; }
        .ai-particle:nth-child(2) { animation-delay: 2s; }
        .ai-particle:nth-child(3) { animation-delay: 4s; }
        
        .ai-node {
          animation: aiPulse 4s ease-in-out infinite;
        }
        
        .ai-node:nth-child(odd) { animation-delay: 2s; }
        
        .circuit-line {
          animation: circuitTrace 10s ease-in-out infinite;
        }
        
        .input-focus:focus {
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(163, 205, 57, 0.25) !important;
          border-color: #a3cd39 !important;
        }
        
        .button-hover:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 25px rgba(163, 205, 57, 0.4);
        }
        
        .category-hover:hover {
          background: rgba(163, 205, 57, 0.1) !important;
          border-color: rgba(163, 205, 57, 0.3) !important;
          transform: translateX(4px);
        }
        
        .document-hover:hover {
          background: rgba(163, 205, 57, 0.05) !important;
          border-color: rgba(163, 205, 57, 0.2) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(163, 205, 57, 0.15);
        }
      `}</style>
      
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99990,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: 'hidden'
      }}>
        {/* AI Neural Network Background */}
        <svg style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          opacity: 0.03
        }}>
          <defs>
            <pattern id="circuit-library" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M20 20h60v60h-60z" fill="none" stroke="#a3cd39" strokeWidth="0.5"/>
              <circle cx="20" cy="20" r="2" fill="#a3cd39"/>
              <circle cx="80" cy="20" r="2" fill="#a3cd39"/>
              <circle cx="20" cy="80" r="2" fill="#a3cd39"/>
              <circle cx="80" cy="80" r="2" fill="#a3cd39"/>
              <path d="M20 20L80 80M80 20L20 80" stroke="#a3cd39" strokeWidth="0.3" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit-library)"/>
          
          <path 
            className="circuit-line"
            d="M0,50 Q200,20 400,50 T800,50" 
            fill="none" 
            stroke="#a3cd39" 
            strokeWidth="2" 
            strokeDasharray="10,5"
            opacity="0.1"
          />
          <path 
            className="circuit-line"
            d="M0,150 Q300,120 600,150 T1200,150" 
            fill="none" 
            stroke="#a3cd39" 
            strokeWidth="1.5" 
            strokeDasharray="8,3"
            opacity="0.08"
            style={{ animationDelay: '3s' }}
          />
        </svg>
        
        {/* AI Data particles flowing */}
        <div className="ai-particle" style={{
          position: 'absolute',
          width: '3px',
          height: '3px',
          background: '#a3cd39',
          borderRadius: '50%',
          top: '15%',
          left: 0,
          zIndex: 1,
          boxShadow: '0 0 8px #a3cd39',
          opacity: 0.4
        }} />
        <div className="ai-particle" style={{
          position: 'absolute',
          width: '2px',
          height: '2px',
          background: '#8bc34a',
          borderRadius: '50%',
          top: '45%',
          left: 0,
          zIndex: 1,
          boxShadow: '0 0 6px #8bc34a',
          opacity: 0.3
        }} />
        <div className="ai-particle" style={{
          position: 'absolute',
          width: '3px',
          height: '3px',
          background: '#a3cd39',
          borderRadius: '50%',
          top: '75%',
          left: 0,
          zIndex: 1,
          boxShadow: '0 0 8px #a3cd39',
          opacity: 0.4
        }} />
        
        {/* Neural network nodes */}
        <div className="ai-node" style={{
          position: 'absolute',
          width: '8px',
          height: '8px',
          background: 'radial-gradient(circle, #a3cd39, #8bc34a)',
          borderRadius: '50%',
          top: '10%',
          left: '5%',
          zIndex: 1,
          boxShadow: '0 0 12px #a3cd39',
          opacity: 0.3
        }} />
        <div className="ai-node" style={{
          position: 'absolute',
          width: '6px',
          height: '6px',
          background: 'radial-gradient(circle, #8bc34a, #a3cd39)',
          borderRadius: '50%',
          top: '40%',
          right: '8%',
          zIndex: 1,
          boxShadow: '0 0 10px #8bc34a',
          opacity: 0.2
        }} />
        
        <div className="library-container" style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 50%, #1a202c 100%)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          width: '95%',
          maxWidth: '1100px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(163, 205, 57, 0.2)',
          position: 'relative',
          zIndex: 2,
          overflow: 'hidden'
        }}>
          {/* AI Neural Network Background - wewnątrz panelu */}
          <svg style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
            opacity: 0.03
          }}>
            <defs>
              <pattern id="circuit-library-inner" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M20 20h60v60h-60z" fill="none" stroke="#a3cd39" strokeWidth="0.5"/>
                <circle cx="20" cy="20" r="2" fill="#a3cd39"/>
                <circle cx="80" cy="20" r="2" fill="#a3cd39"/>
                <circle cx="20" cy="80" r="2" fill="#a3cd39"/>
                <circle cx="80" cy="80" r="2" fill="#a3cd39"/>
                <path d="M20 20L80 80M80 20L20 80" stroke="#a3cd39" strokeWidth="0.3" opacity="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#circuit-library-inner)"/>
            
            <path 
              className="circuit-line"
              d="M0,50 Q200,20 400,50 T800,50" 
              fill="none" 
              stroke="#a3cd39" 
              strokeWidth="2" 
              strokeDasharray="10,5"
              opacity="0.1"
            />
            <path 
              className="circuit-line"
              d="M0,150 Q300,120 600,150 T1200,150" 
              fill="none" 
              stroke="#a3cd39" 
              strokeWidth="1.5" 
              strokeDasharray="8,3"
              opacity="0.08"
              style={{ animationDelay: '3s' }}
            />
          </svg>
          
          {/* AI Data particles flowing - wewnątrz panelu */}
          <div className="ai-particle" style={{
            position: 'absolute',
            width: '3px',
            height: '3px',
            background: '#a3cd39',
            borderRadius: '50%',
            top: '15%',
            left: 0,
            zIndex: 1,
            boxShadow: '0 0 8px #a3cd39',
            opacity: 0.4
          }} />
          <div className="ai-particle" style={{
            position: 'absolute',
            width: '2px',
            height: '2px',
            background: '#8bc34a',
            borderRadius: '50%',
            top: '45%',
            left: 0,
            zIndex: 1,
            boxShadow: '0 0 6px #8bc34a',
            opacity: 0.3
          }} />
          <div className="ai-particle" style={{
            position: 'absolute',
            width: '3px',
            height: '3px',
            background: '#a3cd39',
            borderRadius: '50%',
            top: '75%',
            left: 0,
            zIndex: 1,
            boxShadow: '0 0 8px #a3cd39',
            opacity: 0.4
          }} />
          
          {/* Neural network nodes - wewnątrz panelu */}
          <div className="ai-node" style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            background: 'radial-gradient(circle, #a3cd39, #8bc34a)',
            borderRadius: '50%',
            top: '10%',
            left: '5%',
            zIndex: 1,
            boxShadow: '0 0 12px #a3cd39',
            opacity: 0.3
          }} />
          <div className="ai-node" style={{
            position: 'absolute',
            width: '6px',
            height: '6px',
            background: 'radial-gradient(circle, #8bc34a, #a3cd39)',
            borderRadius: '50%',
            top: '40%',
            right: '8%',
            zIndex: 1,
            boxShadow: '0 0 10px #8bc34a',
            opacity: 0.2
          }} />

          {/* Nagłówek */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(163, 205, 57, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(163, 205, 57, 0.2), transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(163, 205, 57, 0.3)'
              }}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#a3cd39" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '24px', 
                fontWeight: 700, 
                color: 'white',
                background: 'linear-gradient(135deg, #a3cd39, #8bc34a)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Biblioteka Wiedzy
              </h2>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Przycisk tworzenia kategorii */}
              <button
                onClick={() => setShowCreateCategory(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(163, 205, 57, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(163, 205, 57, 0.3)';
                  e.currentTarget.style.color = '#a3cd39';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Nowa kategoria
              </button>
              
              {/* Przycisk dodawania dokumentu */}
              <button
                onClick={() => setShowUploadForm(true)}
                className="button-hover"
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #a3cd39 0%, #8bc34a 100%)',
                  color: '#1a1a1a',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 15px rgba(163, 205, 57, 0.3)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Dodaj dokument
              </button>
              
              <button 
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  padding: '4px',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                &times;
              </button>
            </div>
          </div>

          {/* Filtry i wyszukiwanie */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(163, 205, 57, 0.2)',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            position: 'relative',
            zIndex: 10
          }}>
            {/* Wyszukiwanie */}
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Szukaj dokumentów..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-focus"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  outline: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </div>

            {/* Przełącznik widoku */}
            <div style={{ 
              display: 'flex', 
              gap: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              padding: '4px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button
                onClick={() => setViewMode('all')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: viewMode === 'all' ? 'linear-gradient(135deg, #a3cd39, #8bc34a)' : 'transparent',
                  color: viewMode === 'all' ? '#1a1a1a' : 'rgba(255, 255, 255, 0.7)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: viewMode === 'all' ? 'linear-gradient(135deg, #a3cd39, #8bc34a)' : 'transparent'
                }}
              >
                Wszystkie
              </button>
              <button
                onClick={() => setViewMode('my')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: viewMode === 'my' ? 'linear-gradient(135deg, #a3cd39, #8bc34a)' : 'transparent',
                  color: viewMode === 'my' ? '#1a1a1a' : 'rgba(255, 255, 255, 0.7)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: viewMode === 'my' ? 'linear-gradient(135deg, #a3cd39, #8bc34a)' : 'transparent'
                }}
              >
                Moje dokumenty
              </button>
            </div>
          </div>

          {/* Zawartość */}
          <div style={{
            display: 'flex',
            height: '500px',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 10
          }}>
            {/* Lista kategorii */}
            <div style={{
              width: '280px',
              borderRight: '1px solid rgba(163, 205, 57, 0.2)',
              overflowY: 'auto',
              padding: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.2)'
            }}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '18px', 
                fontWeight: 600, 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a3cd39" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                Kategorie
              </h3>
              
              {isLoading && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  color: 'rgba(255, 255, 255, 0.6)',
                  padding: '16px'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(163, 205, 57, 0.3)',
                    borderTop: '2px solid #a3cd39',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Ładowanie...
                </div>
              )}
              
              {error && (
                <div style={{ 
                  color: '#ef4444', 
                  padding: '12px', 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}
              
              {categories.length === 0 && !isLoading && !error && (
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  textAlign: 'center', 
                  padding: '20px',
                  fontSize: '14px'
                }}>
                  Brak dostępnych kategorii
                </div>
              )}
              
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {categories.map((category, index) => (
                  <li key={category.id} className="category-item">
                    <div
                      className="category-hover"
                      style={{
                        padding: '12px 16px',
                        width: '100%',
                        textAlign: 'left',
                        background: selectedCategory === category.id 
                          ? 'rgba(163, 205, 57, 0.15)' 
                          : 'rgba(255, 255, 255, 0.05)',
                        border: selectedCategory === category.id 
                          ? '1px solid rgba(163, 205, 57, 0.4)' 
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      {/* Główny obszar kategorii */}
                      <div 
                        onClick={() => checkCategoryAccess(category.id, category)}
                        style={{
                          flex: 1,
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ 
                          fontWeight: 600, 
                          color: selectedCategory === category.id ? 'white' : 'rgba(255, 255, 255, 0.9)',
                          marginBottom: '4px',
                          fontSize: '15px'
                        }}>
                          {category.name}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: 'rgba(255, 255, 255, 0.5)', 
                          display: 'flex', 
                          gap: '8px', 
                          alignItems: 'center',
                          flexWrap: 'wrap'
                        }}>
                          {!category.isPublic && (
                            <span style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '2px',
                              backgroundColor: 'rgba(163, 205, 57, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(163, 205, 57, 0.2)'
                            }}>
                              🔒 Prywatna
                            </span>
                          )}
                          {category.hasPassword && (
                            <span style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '2px',
                              backgroundColor: 'rgba(255, 193, 7, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(255, 193, 7, 0.2)'
                            }}>
                              🔑 Hasło
                            </span>
                          )}
                          {category.isOwner && (
                            <span style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '2px',
                              backgroundColor: 'rgba(163, 205, 57, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(163, 205, 57, 0.2)'
                            }}>
                              👤 Moja
                            </span>
                          )}
                          {!category.isOwner && !category.hasPassword && category.isPublic && (
                            <span style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '2px',
                              backgroundColor: 'rgba(34, 197, 94, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(34, 197, 94, 0.2)'
                            }}>
                              📁 Publiczna
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Przycisk usuwania kategorii */}
                      {category.isOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category.id, category.name);
                          }}
                          style={{
                            padding: '6px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            opacity: 0.7,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Usuń kategorię"
                          onMouseOver={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.opacity = '0.7';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Lista dokumentów */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px'
            }}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '18px', 
                fontWeight: 600, 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a3cd39" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                Dokumenty 
                {viewMode === 'my' && (
                  <span style={{ color: '#a3cd39', fontSize: '16px' }}>(moje)</span>
                )}
                {searchTerm && (
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '16px' }}>
                    (wyszukiwanie: "{searchTerm}")
                  </span>
                )}
              </h3>
              
              {isLoading && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  color: 'rgba(255, 255, 255, 0.6)',
                  padding: '16px'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(163, 205, 57, 0.3)',
                    borderTop: '2px solid #a3cd39',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Ładowanie...
                </div>
              )}
              
              {error && (
                <div style={{ 
                  color: '#ef4444', 
                  padding: '12px', 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}
              
              {filteredDocuments.length === 0 && !isLoading && !error && (
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  fontSize: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '12px',
                  border: '1px dashed rgba(255, 255, 255, 0.1)'
                }}>
                  {searchTerm 
                    ? `Brak dokumentów pasujących do "${searchTerm}"`
                    : `Brak dokumentów w wybranej kategorii`
                  }
                </div>
              )}
              
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {filteredDocuments.map((doc, index) => (
                  <li key={doc.id} className="document-item" style={{
                    padding: '16px',
                    borderBottom: 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    backgroundColor: selectedDocIds.includes(doc.id) 
                      ? 'rgba(163, 205, 57, 0.15)' 
                      : 'rgba(255, 255, 255, 0.03)',
                    border: selectedDocIds.includes(doc.id)
                      ? '1px solid rgba(163, 205, 57, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    marginBottom: '8px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <input
                      type="checkbox"
                      id={`doc-${doc.id}`}
                      checked={selectedDocIds.includes(doc.id)}
                      onChange={() => handleDocumentToggle(doc.id)}
                      style={{ 
                        marginRight: '16px', 
                        marginTop: '4px',
                        transform: 'scale(1.2)',
                        accentColor: '#a3cd39'
                      }}
                    />
                    
                    {/* Główny obszar dokumentu */}
                    <div 
                      onClick={() => handleDocumentToggle(doc.id)}
                      className="document-hover"
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        flex: 1,
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '8px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid transparent'
                      }}
                    >
                      <div style={{ marginRight: '16px', marginTop: '2px' }}>
                        {getDocumentIcon(doc.fileType)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontWeight: 600, 
                          marginBottom: '6px',
                          color: 'white',
                          fontSize: '15px'
                        }}>
                          {doc.title}
                        </div>
                        {doc.description && (
                          <div style={{ 
                            fontSize: '13px', 
                            color: 'rgba(255, 255, 255, 0.6)',
                            marginBottom: '8px',
                            lineHeight: '1.4'
                          }}>
                            {doc.description}
                          </div>
                        )}
                        <div style={{ 
                          fontSize: '12px', 
                          color: 'rgba(255, 255, 255, 0.4)',
                          display: 'flex',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}>
                          <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{doc.uploadedBy || 'Nieznany użytkownik'}</span>
                          {doc.fileSize && (
                            <>
                              <span>•</span>
                              <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Przycisk usuwania dokumentu */}
                    {(doc.uploadedByEmail === currentUserEmail || currentCategoryOwner) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc.id, doc.title);
                        }}
                        style={{
                          marginLeft: '8px',
                          padding: '6px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          opacity: 0.7,
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Usuń dokument"
                        onMouseOver={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.opacity = '0.7';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Stopka */}
          <div style={{
            padding: '20px 24px',
            borderTop: '1px solid rgba(163, 205, 57, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            position: 'relative',
            zIndex: 10
          }}>
            <div style={{ 
              fontSize: '14px', 
              color: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a3cd39" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              Wybrano dokumentów: <strong style={{ color: '#a3cd39' }}>{selectedDocIds.length}</strong>
              {filteredDocuments.length > 0 && (
                <span> z {filteredDocuments.length} dostępnych</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                Anuluj
              </button>
              <button
                onClick={handleApply}
                disabled={!currentChatId}
                className="button-hover"
                style={{
                  padding: '10px 20px',
                  background: currentChatId 
                    ? 'linear-gradient(135deg, #a3cd39 0%, #8bc34a 100%)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  color: currentChatId ? '#1a1a1a' : 'rgba(255, 255, 255, 0.4)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: currentChatId ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: currentChatId ? '0 4px 15px rgba(163, 205, 57, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Zastosuj wybrane ({selectedDocIds.length})
              </button>
            </div>
          </div>
        </div>
        
        {showCreateCategory && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000
          }}>
            <CreateCategoryForm 
              onClose={() => setShowCreateCategory(false)} 
              onCategoryCreated={handleCategoryAdded}
            />
          </div>
        )}
        
        {showUploadForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000
          }}>
            <UserUploadDocumentForm 
              onClose={() => setShowUploadForm(false)} 
              onDocumentAdded={handleDocumentAdded}
            />
          </div>
        )}
      </div>
    </>
  );
}