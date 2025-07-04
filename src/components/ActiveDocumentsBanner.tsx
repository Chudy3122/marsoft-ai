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

  const getFileTypeIcon = (fileType: string) => {
    switch(fileType.toLowerCase()) {
      case 'pdf':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3cd39" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        );
      case 'excel':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3cd39" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3cd39" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        );
    }
  };
  
  if (documentIds.length === 0) return null;
  
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes aiPulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.6;
          }
          50% { 
            transform: scale(1.1);
            opacity: 1;
          }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .banner-container {
          animation: fadeInUp 0.5s ease-out;
        }
        
        .ai-glow {
          animation: aiPulse 3s ease-in-out infinite;
        }
        
        .document-item {
          animation: fadeInUp 0.4s ease-out forwards;
          opacity: 0;
        }
        
        .document-item:nth-child(1) { animation-delay: 0.1s; }
        .document-item:nth-child(2) { animation-delay: 0.15s; }
        .document-item:nth-child(3) { animation-delay: 0.2s; }
        .document-item:nth-child(4) { animation-delay: 0.25s; }
        .document-item:nth-child(5) { animation-delay: 0.3s; }
        
        .button-hover:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(163, 205, 57, 0.3);
        }
        
        .shimmer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(163, 205, 57, 0.1), transparent);
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
      
      <div 
        className="banner-container"
        style={{
          margin: '12px 0',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(163, 205, 57, 0.1) 0%, rgba(139, 195, 74, 0.05) 100%)',
          borderRadius: '12px',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid rgba(163, 205, 57, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 15px rgba(163, 205, 57, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        }}
      >
        {/* Animated shimmer effect */}
        <div className="shimmer" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none'
        }} />
        
        {/* AI glow effect */}
        <div className="ai-glow" style={{
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '4px',
          height: '60%',
          background: 'linear-gradient(to bottom, transparent, #a3cd39, transparent)',
          borderRadius: '2px'
        }} />
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          flex: 1,
          paddingLeft: '24px',
          zIndex: 1
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(163, 205, 57, 0.3), rgba(163, 205, 57, 0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px',
            border: '2px solid rgba(163, 205, 57, 0.4)',
            boxShadow: '0 0 12px rgba(163, 205, 57, 0.3)'
          }}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
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
          
          <div>
            <div style={{ 
              fontWeight: 600, 
              marginBottom: '4px',
              color: 'white',
              fontSize: '15px'
            }}>
              Aktywne dokumenty ({documents.length})
            </div>
            
            {documents.length <= 3 ? (
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                {documents.map((doc, index) => (
                  <div 
                    key={doc.id}
                    className="document-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(163, 205, 57, 0.2)',
                      fontSize: '13px',
                      fontWeight: 500,
                      backdropFilter: 'blur(5px)'
                    }}
                  >
                    {getFileTypeIcon(doc.fileType)}
                    <span>{doc.title.length > 25 ? `${doc.title.substring(0, 25)}...` : doc.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '13px'
              }}>
                {documents.slice(0, 2).map(doc => doc.title).join(', ')}
                {documents.length > 2 && (
                  <span style={{ 
                    color: '#a3cd39', 
                    fontWeight: 600,
                    marginLeft: '4px'
                  }}>
                    i {documents.length - 2} więcej...
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          zIndex: 1
        }}>
          <button
            onClick={onChangeDocuments}
            className="button-hover"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(163, 205, 57, 0.3)',
              color: '#a3cd39',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(163, 205, 57, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(163, 205, 57, 0.5)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(163, 205, 57, 0.3)';
              e.currentTarget.style.color = '#a3cd39';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Zmień
          </button>
          
          <button
            onClick={onClearDocuments}
            className="button-hover"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
              e.currentTarget.style.color = '#ef4444';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Wyczyść
          </button>
        </div>
      </div>
    </>
  );
}