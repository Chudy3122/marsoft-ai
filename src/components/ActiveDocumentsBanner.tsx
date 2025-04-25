// src/components/ActiveDocumentsBanner.tsx
'use client';

import { useState, useEffect } from 'react';

interface ActiveDocumentsBannerProps {
  documentIds: string[];
  onClearDocuments: () => void;
  onChangeDocuments: () => void;
}

export default function ActiveDocumentsBanner({ 
  documentIds, 
  onClearDocuments,
  onChangeDocuments
}: ActiveDocumentsBannerProps) {
  const [documents, setDocuments] = useState<Array<{id: string, title: string, fileType: string}>>([]);
  
  useEffect(() => {
    if (documentIds.length > 0) {
      fetchDocumentDetails();
    } else {
      setDocuments([]);
    }
  }, [documentIds]);
  
  const fetchDocumentDetails = async () => {
    try {
      const idsParam = documentIds.join(',');
      const response = await fetch(`/api/knowledge/documents/details?ids=${idsParam}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Błąd podczas pobierania szczegółów dokumentów:', error);
    }
  };
  
  if (documentIds.length === 0) return null;
  
  return (
    <div style={{
      margin: '8px 0',
      padding: '8px 12px',
      backgroundColor: '#f0f9ff',
      borderRadius: '8px',
      fontSize: '14px',
      color: '#0369a1',
      borderLeft: '3px solid #0ea5e9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <span>
          Aktywne dokumenty ({documents.length}): {' '}
          {documents.map(doc => doc.title).join(', ')}
        </span>
      </div>
      <div>
        <button
          onClick={onChangeDocuments}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#0369a1',
            marginRight: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            textDecoration: 'underline'
          }}
        >
          Zmień
        </button>
        <button
          onClick={onClearDocuments}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#0369a1',
            cursor: 'pointer',
            fontSize: '14px',
            textDecoration: 'underline'
          }}
        >
          Wyczyść
        </button>
      </div>
    </div>
  );
}