// src/components/KnowledgeLibraryPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { Category, Document } from '@/types/knowledge';
import AdminUploadDocumentForm from './AdminUploadDocumentForm';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(selectedDocumentIds);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pobieranie kategorii
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      
      // Sprawdź czy użytkownik jest adminem
      const checkAdmin = async () => {
        try {
          const response = await fetch('/api/auth/check-admin');
          if (response.ok) {
            const data = await response.json();
            setIsAdmin(data.isAdmin);
          }
        } catch (error) {
          console.error('Błąd podczas sprawdzania uprawnień:', error);
        }
      };
      
      checkAdmin();
    }
  }, [isOpen]);

  // Pobieranie dokumentów, gdy wybrano kategorię
  useEffect(() => {
    if (selectedCategory) {
      fetchDocuments(selectedCategory);
    }
  }, [selectedCategory]);

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
      const response = await fetch(`/api/knowledge/documents?categoryId=${categoryId}`);
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

  // Funkcja odświeżająca dokumenty po dodaniu nowego
  const handleDocumentAdded = () => {
    if (selectedCategory) {
      fetchDocuments(selectedCategory);
    }
  };

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
        width: '80%',
        maxWidth: '900px',
        maxHeight: '80vh',
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
            <div>
                {isAdmin && (
                <button
                    onClick={() => setShowUploadForm(true)}
                    style={{
                    marginRight: '12px',
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
                )}
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
                  <button
                    onClick={() => setSelectedCategory(category.id)}
                    style={{
                      padding: '8px 12px',
                      width: '100%',
                      textAlign: 'left',
                      background: selectedCategory === category.id ? '#f3f4f6' : 'none',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {category.name}
                  </button>
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
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Dokumenty</h3>
            {isLoading && <div>Ładowanie...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}
            {documents.length === 0 && !isLoading && !error && (
              <div>Brak dokumentów w wybranej kategorii</div>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {documents.map(doc => (
                <li key={doc.id} style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <input
                    type="checkbox"
                    id={`doc-${doc.id}`}
                    checked={selectedDocIds.includes(doc.id)}
                    onChange={() => handleDocumentToggle(doc.id)}
                    style={{ marginRight: '12px' }}
                  />
                  <label 
                    htmlFor={`doc-${doc.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flex: 1,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ marginRight: '8px' }}>
                      {getDocumentIcon(doc.fileType)}
                    </div>
                    <div>
                      <div>{doc.title}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </label>
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
          <div>
            Wybrano dokumentów: {selectedDocIds.length}
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
              Zastosuj wybrane
            </button>
          </div>
        </div>
      </div>
      {showUploadForm && (
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
            zIndex: 2000
        }}>
            <AdminUploadDocumentForm 
              onClose={() => setShowUploadForm(false)} 
              onDocumentAdded={handleDocumentAdded}
            />
        </div>
      )}
    </div>
  );
}