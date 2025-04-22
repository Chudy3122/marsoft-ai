'use client';

// src/components/PdfUploadButton.tsx
import React, { useState, useRef } from 'react';

interface PdfUploadButtonProps {
  onPdfContent?: (content: string, metadata: any) => void;
}

const PdfUploadButton: React.FC<PdfUploadButtonProps> = ({ onPdfContent }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setError('Proszę wybrać plik PDF.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Tworzenie formularza do wysłania
      const formData = new FormData();
      formData.append('file', file);
      
      // Wysyłanie pliku do API
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas przetwarzania pliku');
      }
      
      const data = await response.json();
      
      if (onPdfContent) {
        onPdfContent(data.text, data.metadata);
      }
      
      // Reset input po wczytaniu
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Błąd podczas przetwarzania PDF:', err);
      setError(`Błąd podczas wczytywania PDF: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="pdf-upload"
      />
      <label 
        htmlFor="pdf-upload" 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '8px 16px',
          backgroundColor: '#a3cd39',
          color: 'white',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? (
          <span>Wczytywanie PDF...</span>
        ) : (
          <>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 20 20" 
              fill="currentColor"
              style={{ marginRight: '8px' }}
            >
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Wgraj PDF
          </>
        )}
      </label>
      
      {error && (
        <div style={{
          color: '#ef4444',
          fontSize: '14px',
          marginTop: '8px'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default PdfUploadButton;