// src/components/AdminUploadDocumentForm.tsx
'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
// Możemy dodać bibliotekę do parsowania PDF na froncie
// import * as pdfjs from 'pdfjs-dist';

interface AdminUploadDocumentFormProps {
  onClose: () => void;
  onDocumentAdded?: () => void;
}

export default function AdminUploadDocumentForm({ onClose, onDocumentAdded }: AdminUploadDocumentFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [fileType, setFileType] = useState('');
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);

  // Pobierz listę kategorii
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/knowledge/categories');
        if (response.ok) {
          const data = await response.json();
          console.log("Pobrano kategorie:", data);
          setCategories(data.categories);
          if (data.categories.length > 0) {
            setCategory(data.categories[0].id);
          }
        }
      } catch (error) {
        console.error('Błąd podczas pobierania kategorii:', error);
      }
    };

    fetchCategories();
  }, []);

  // Obsługa wyboru pliku
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
  
    setFile(selectedFile);
    setProcessingFile(true);
    
    // Ustaw typ pliku
    if (selectedFile.name.endsWith('.pdf')) {
      setFileType('pdf');
    } else if (selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setFileType('excel');
    } else if (selectedFile.name.match(/\.(doc|docx)$/i)) {
      setFileType('doc');
    } else {
      setFileType('other');
    }
  
    // Ustaw tytuł na nazwę pliku jeśli nie jest ustawiony
    if (!title) {
      setTitle(selectedFile.name);
    }
  
    try {
      // Dla Excel
      if (selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
          type: 'array',
          cellDates: true,
        });
  
        let allText = '';
        
        // Przetwarzanie wszystkich arkuszy
        workbook.SheetNames.forEach(name => {
          const sheet = workbook.Sheets[name];
          allText += `# Arkusz: ${name}\n\n`;
          allText += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
        });
        
        setFileContent(allText);
      } 
      // Dla PDF - wykorzystaj istniejące API
      else if (selectedFile.name.endsWith('.pdf')) {
        // Tworzenie formularza do wysłania
        const formData = new FormData();
        formData.append('file', selectedFile);
        
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
        console.log("Wyekstrahowano tekst z PDF, długość:", data.text.length);
        
        // WAŻNA ZMIANA: Używamy faktycznego tekstu wyekstrahowanego z PDF
        // zamiast zapisywać tylko metadane w JSON
        setFileContent(data.text);
      }
      // Dla innych plików tekstowych
      else {
        try {
          const text = await selectedFile.text();
          setFileContent(text);
        } catch (error) {
          // Jeśli nie można odczytać jako tekst, traktuj jako plik binarny
          const fileInfo = {
            filename: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type,
            lastModified: new Date(selectedFile.lastModified).toISOString(),
            content: "Ten plik nie zawiera tekstu, który można odczytać."
          };
          
          setFileContent(JSON.stringify(fileInfo));
        }
      }
    } catch (error) {
      console.error('Błąd podczas wczytywania pliku:', error);
      setError('Nie udało się wczytać zawartości pliku: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setProcessingFile(false);
    }
  };

  // Obsługa wysłania formularza
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !category || !file || !fileContent) {
      setError('Wszystkie pola są wymagane');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      console.log("Próba wysłania dokumentu:", { 
        title, 
        fileType, 
        category,
        contentLength: fileContent.length,
        contentPreview: fileContent.substring(0, 200) + "..." 
      });
      
      const response = await fetch('/api/knowledge/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          fileType,
          content: fileContent,
          categoryId: category
        }),
      });
      
      console.log("Status odpowiedzi:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Szczegóły błędu:", errorData);
        throw new Error('Błąd podczas dodawania dokumentu');
      }
      
      const data = await response.json();
      console.log("Sukces - dokument dodany:", data);
      
      setSuccess(true);
      
      // Wywołaj funkcję odświeżania dokumentów jeśli została przekazana
      if (onDocumentAdded) {
        onDocumentAdded();
      }
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Błąd podczas dodawania dokumentu:', error);
      setError('Wystąpił błąd podczas dodawania dokumentu. Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: '500px',
      maxWidth: '100%'
    }}>
      <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Dodaj dokument do biblioteki</h2>
      
      {success ? (
        <div style={{
          backgroundColor: '#f0fdf4',
          color: '#166534',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          Dokument został pomyślnie dodany do biblioteki!
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}
          
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="title"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 500
              }}
            >
              Tytuł dokumentu
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="category"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 500
              }}
            >
              Kategoria
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
              required
            >
              {categories.length === 0 ? (
                <option value="">Brak dostępnych kategorii</option>
              ) : (
                categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))
              )}
            </select>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="file"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 500
              }}
            >
              Plik
            </label>
            <input
              id="file"
              type="file"
              accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
              required
              disabled={processingFile}
            />
            {processingFile && (
              <div style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                Przetwarzanie pliku...
              </div>
            )}
            {file && !processingFile && (
              <div style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                Wybrany plik: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              disabled={isLoading || processingFile}
            >
              Anuluj
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                backgroundColor: '#a3cd39',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (isLoading || processingFile) ? 'not-allowed' : 'pointer',
                opacity: (isLoading || processingFile) ? 0.7 : 1
              }}
              disabled={isLoading || processingFile}
            >
              {isLoading ? 'Dodawanie...' : 'Dodaj dokument'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}