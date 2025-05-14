// src/components/PdfDocumentEmbed.tsx

import React, { useState, useEffect } from 'react';

interface PdfDocumentEmbedProps {
  pdfUrl: string;
  title?: string;
  width?: string | number;
  height?: string | number;
}

const PdfDocumentEmbed: React.FC<PdfDocumentEmbedProps> = ({
  pdfUrl,
  title = 'Dokument PDF',
  width = '100%',
  height = 300 // Zmniejszona domyślna wysokość
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    // Sprawdź czy URL jest prawidłowy
    if (!pdfUrl) {
      setError('Brak URL dokumentu PDF');
      setIsLoading(false);
      return;
    }
    
    // Symulacja ładowania
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [pdfUrl]);
  
  const handleDownload = () => {
    // Otwórz link w nowym oknie
    window.open(pdfUrl, '_blank');
  };
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: 'white',
      marginTop: '8px',
      marginBottom: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      maxWidth: '500px' // Ograniczenie maksymalnej szerokości
    }}>
      {/* Nagłówek dokumentu - bardziej kompaktowy */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f9fafb',
        padding: '8px 12px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, overflow: 'hidden' }}>
          <svg 
            style={{ 
              width: '16px', 
              height: '16px', 
              color: '#ef4444', 
              marginRight: '8px',
              flexShrink: 0
            }}
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <h3 style={{ 
            fontSize: '13px', 
            fontWeight: 500, 
            color: '#4b5563', 
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>{title}</h3>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Przycisk rozwijania/zwijania */}
          <button
            onClick={toggleExpand}
            style={{ 
              display: 'flex', 
              alignItems: 'center',
              fontSize: '12px',
              color: '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
            title={isExpanded ? "Zwiń" : "Rozwiń"}
          >
            <svg 
              style={{ width: '16px', height: '16px' }}
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              {isExpanded ? (
                <polyline points="18 15 12 9 6 15"></polyline>
              ) : (
                <polyline points="6 9 12 15 18 9"></polyline>
              )}
            </svg>
          </button>
          
          {/* Przycisk pobierania */}
          <button
            onClick={handleDownload}
            style={{ 
              display: 'flex', 
              alignItems: 'center',
              fontSize: '12px',
              color: '#2563eb',
              backgroundColor: 'transparent',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
            title="Pobierz PDF"
          >
            <svg 
              style={{ width: '16px', height: '16px' }}
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Treść dokumentu - pokazuje się tylko gdy rozwinięta */}
      {isExpanded && (
        <div style={{ width, height: typeof height === 'number' ? height : 300 }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#f9fafb'
            }}>
              <div style={{
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                border: '2px solid #e5e7eb',
                borderTopColor: '#3b82f6',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>
          ) : error ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: '#fee2e2',
              color: '#ef4444',
              padding: '16px',
              fontSize: '12px'
            }}>
              <svg 
                style={{ width: '16px', height: '16px', marginRight: '8px' }}
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          ) : (
            <iframe 
              src={`${pdfUrl}#toolbar=0&navpanes=0`}
              width="100%" 
              height="100%" 
              title={title}
              style={{ border: 'none' }}
            ></iframe>
          )}
        </div>
      )}
      
      {/* Dodajemy informację o dokumencie gdy zwinięty */}
      {!isExpanded && (
        <div style={{
          padding: '8px 12px',
          fontSize: '12px',
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center'
        }}>
          <svg 
            style={{ width: '14px', height: '14px', marginRight: '6px' }}
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <path d="M14 2v6h6"></path>
          </svg>
          <span>Dokument PDF - kliknij aby rozwinąć lub pobrać</span>
        </div>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PdfDocumentEmbed;