// src/components/DocumentUploadPanel.tsx
'use client';

import { useState } from 'react';

interface DocumentUploadPanelProps {
  onDocumentAnalyzed: (result: any) => void;
}

export default function DocumentUploadPanel({ onDocumentAnalyzed }: DocumentUploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      setError('');
    }
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDocumentText(e.target.value);
    setError('');
  };

  const handleUploadDocument = async () => {
    try {
      setIsUploading(true);
      setError('');
      
      if (!file && !documentText) {
        setError('Wybierz plik lub wprowadź tekst dokumentu.');
        return;
      }
      
      // Jeśli mamy plik do wgrania
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Wystąpił problem podczas wgrywania dokumentu');
        }
        
        const data = await response.json();
        setIsUploading(false);
        
        // Analizuj wgrany dokument
        handleAnalyzeDocument(data.document.id);
      } 
      // Jeśli mamy tekst do analizy
      else if (documentText) {
        const response = await fetch('/api/documents/create-from-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            title: 'Dokument harmonogramu',
            content: documentText,
            fileType: 'text'
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Wystąpił problem podczas tworzenia dokumentu');
        }
        
        const data = await response.json();
        setIsUploading(false);
        
        // Analizuj utworzony dokument
        handleAnalyzeDocument(data.document.id);
      }
    } catch (error) {
      console.error('Błąd podczas wgrywania dokumentu:', error);
      setError((error as Error).message || 'Wystąpił nieoczekiwany błąd.');
      setIsUploading(false);
    }
  };
  
  const handleAnalyzeDocument = async (documentId: string) => {
    try {
      setIsAnalyzing(true);
      setError('');
      
      const response = await fetch('/api/projects/generate-from-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Wystąpił problem podczas analizy dokumentu');
      }
      
      const result = await response.json();
      onDocumentAnalyzed(result);
    } catch (error) {
      console.error('Błąd podczas analizy dokumentu:', error);
      setError((error as Error).message || 'Wystąpił nieoczekiwany błąd podczas analizy.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ 
      padding: '24px', 
      backgroundColor: '#f9fafb', 
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      marginBottom: '24px'
    }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
        Utwórz projekt z dokumentu harmonogramu
      </h2>
      
      {error && (
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#fee2e2', 
          color: '#b91c1c', 
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}
      
      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontSize: '14px', 
          fontWeight: 500,
          color: '#374151' 
        }}>
          Wgraj plik
        </label>
        <input 
          type="file"
          accept=".txt,.pdf,.docx,.doc,.rtf,.odt"
          onChange={handleFileChange}
          style={{
            width: '100%',
            padding: '8px 0',
            fontSize: '14px'
          }}
        />
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
          Akceptowane formaty: .txt, .pdf, .docx, .doc, .rtf, .odt
        </p>
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <label style={{ 
            fontSize: '14px', 
            fontWeight: 500,
            color: '#374151' 
          }}>
            lub wklej tekst dokumentu
          </label>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            LUB
          </span>
        </div>
        
        <textarea
          value={documentText}
          onChange={handleTextChange}
          placeholder="Wklej tutaj tekst dokumentu zawierający terminy i zadania projektu..."
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleUploadDocument}
          disabled={isUploading || isAnalyzing || (!file && !documentText)}
          style={{
            padding: '10px 16px',
            backgroundColor: '#a3cd39',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isUploading || isAnalyzing || (!file && !documentText) ? 'not-allowed' : 'pointer',
            opacity: isUploading || isAnalyzing || (!file && !documentText) ? 0.7 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {(isUploading || isAnalyzing) && (
            <div style={{ 
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '50%',
              borderTopColor: 'white',
              animation: 'spin 1s linear infinite'
            }}></div>
          )}
          {isUploading 
            ? 'Wgrywanie dokumentu...' 
            : isAnalyzing 
              ? 'Analizowanie dokumentu...' 
              : 'Wgraj i utwórz projekt'}
        </button>
      </div>
    </div>
  );
}