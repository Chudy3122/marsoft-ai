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

      // Pokaż komunikat o sukcesie (opcjonalnie - można usunąć jeśli za dużo alertów)
      // alert(`Dokument "${documentTitle}" został pomyślnie usunięty.`);

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
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E44D26" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        );
      case 'excel':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D6F42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '85%',
        maxWidth: '1000px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Nagłówek */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Biblioteka Wiedzy</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Przycisk tworzenia kategorii */}
            <button
              onClick={() => setShowCreateCategory(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginRight: '8px'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Nowa kategoria
            </button>
            
            {/* Przycisk dodawania dokumentu - teraz dostępny dla wszystkich */}
            <button
              onClick={() => setShowUploadForm(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#a3cd39',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
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
                fontSize: '20px'
              }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Filtry i wyszukiwanie */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          {/* Wyszukiwanie */}
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Szukaj dokumentów..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Przełącznik widoku */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setViewMode('all')}
              style={{
                padding: '6px 12px',
                backgroundColor: viewMode === 'all' ? '#a3cd39' : 'white',
                color: viewMode === 'all' ? 'white' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Wszystkie
            </button>
            <button
              onClick={() => setViewMode('my')}
              style={{
                padding: '6px 12px',
                backgroundColor: viewMode === 'my' ? '#a3cd39' : 'white',
                color: viewMode === 'my' ? 'white' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
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
          overflow: 'hidden'
        }}>
          {/* Lista kategorii */}
          <div style={{
            width: '250px',
            borderRight: '1px solid #e5e7eb',
            overflowY: 'auto',
            padding: '16px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Kategorie</h3>
            {isLoading && <div>Ładowanie...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}
            {categories.length === 0 && !isLoading && !error && (
              <div>Brak dostępnych kategorii</div>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {categories.map(category => (
                <li key={category.id}>
                  <div
                    style={{
                      padding: '8px 12px',
                      width: '100%',
                      textAlign: 'left',
                      background: selectedCategory === category.id ? '#f3f4f6' : 'none',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    {/* Główny obszar kategorii - kliknij aby wybrać */}
                    <div 
                      onClick={() => checkCategoryAccess(category.id, category)}
                      style={{
                        flex: 1,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>
                        {category.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {!category.isPublic && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            🔒 Prywatna
                          </span>
                        )}
                        {category.hasPassword && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            🔑 Hasło
                          </span>
                        )}
                        {category.isOwner && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            👤 Moja
                          </span>
                        )}
                        {!category.isOwner && !category.hasPassword && category.isPublic && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            📁 Publiczna
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Przycisk usuwania kategorii - tylko dla właściciela - OSOBNY PRZYCISK */}
                    {category.isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id, category.name);
                        }}
                        style={{
                          padding: '4px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          opacity: 0.7,
                          transition: 'all 0.2s'
                        }}
                        title="Usuń kategorię"
                        onMouseOver={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.backgroundColor = '#fee2e2';
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
            padding: '16px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
              Dokumenty 
              {viewMode === 'my' && ' (moje)'}
              {searchTerm && ` (wyszukiwanie: "${searchTerm}")`}
            </h3>
            {isLoading && <div>Ładowanie...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}
            {filteredDocuments.length === 0 && !isLoading && !error && (
              <div>
                {searchTerm 
                  ? `Brak dokumentów pasujących do "${searchTerm}"`
                  : `Brak dokumentów w wybranej kategorii`
                }
              </div>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {filteredDocuments.map(doc => (
                <li key={doc.id} style={{
                  padding: '12px',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  alignItems: 'flex-start',
                  backgroundColor: selectedDocIds.includes(doc.id) ? '#f0fdf4' : 'transparent',
                  borderRadius: '4px',
                  marginBottom: '4px'
                }}>
                  <input
                    type="checkbox"
                    id={`doc-${doc.id}`}
                    checked={selectedDocIds.includes(doc.id)}
                    onChange={() => handleDocumentToggle(doc.id)}
                    style={{ marginRight: '12px', marginTop: '2px' }}
                  />
                  
                  {/* Główny obszar dokumentu - kliknij aby zaznaczyć checkbox */}
                  <div 
                    onClick={() => handleDocumentToggle(doc.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      flex: 1,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ marginRight: '12px', marginTop: '2px' }}>
                      {getDocumentIcon(doc.fileType)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                        {doc.title}
                      </div>
                      {doc.description && (
                        <div style={{ 
                          fontSize: '13px', 
                          color: '#6b7280',
                          marginBottom: '4px'
                        }}>
                          {doc.description}
                        </div>
                      )}
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#9ca3af',
                        display: 'flex',
                        gap: '12px'
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
                  
                  {/* Przycisk usuwania dokumentu - OSOBNY PRZYCISK poza obszarem kliknięcia */}
                  {(doc.uploadedByEmail === currentUserEmail || currentCategoryOwner) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc.id, doc.title);
                      }}
                      style={{
                        marginLeft: '8px',
                        padding: '4px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        opacity: 0.7,
                        transition: 'all 0.2s'
                      }}
                      title="Usuń dokument"
                      onMouseOver={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.backgroundColor = '#fee2e2';
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
          padding: '16px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Wybrano dokumentów: <strong>{selectedDocIds.length}</strong>
            {filteredDocuments.length > 0 && (
              <span> z {filteredDocuments.length} dostępnych</span>
            )}
          </div>
          <div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                marginRight: '8px',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Anuluj
            </button>
            <button
              onClick={handleApply}
              disabled={!currentChatId}
              style={{
                padding: '8px 16px',
                backgroundColor: '#a3cd39',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: currentChatId ? 'pointer' : 'not-allowed',
                opacity: currentChatId ? 1 : 0.6
              }}
            >
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
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
  );
}