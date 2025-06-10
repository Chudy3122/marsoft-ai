// src/components/UserUploadDocumentForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Category } from '@/types/knowledge';

interface UserUploadDocumentFormProps {
  onClose: () => void;
  onDocumentAdded: () => void;
}

export default function UserUploadDocumentForm({ onClose, onDocumentAdded }: UserUploadDocumentFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/knowledge/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
        
        // Ustaw pierwszą kategorię jako domyślną
        if (data.categories && data.categories.length > 0) {
          setCategoryId(data.categories[0].id);
        }
      }
    } catch (error) {
      console.error('Błąd podczas pobierania kategorii:', error);
    }
  };

  const handleFileChange = (selectedFile: File) => {
    // Sprawdź typ pliku
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Nieprawidłowy typ pliku. Dozwolone są: PDF, Excel, Word, TXT');
      return;
    }

    // Sprawdź rozmiar pliku (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Plik jest za duży. Maksymalny rozmiar to 10MB.');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Automatycznie ustaw tytuł na podstawie nazwy pliku
    if (!title) {
      const nameWithoutExtension = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExtension);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !title.trim() || !categoryId) {
      setError('Wypełnij wszystkie wymagane pola i wybierz plik.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('categoryId', categoryId);

      console.log('Przesyłanie pliku do biblioteki wiedzy...');

      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas przesyłania pliku');
      }

      const result = await response.json();
      console.log('Plik przesłany pomyślnie:', result);

      // Powiadom o dodaniu dokumentu
      onDocumentAdded();
      onClose();

    } catch (error) {
      console.error('Błąd podczas przesyłania:', error);
      setError(error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd');
    } finally {
      setIsUploading(false);
    }
  };

  const getFileTypeDisplay = (file: File) => {
    const extension = file.name.split('.').pop()?.toUpperCase();
    return extension || 'PLIK';
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: '500px',
      maxWidth: '90vw',
      maxHeight: '80vh',
      overflow: 'auto'
    }}>
      {/* Nagłówek */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
          Dodaj dokument do biblioteki
        </h2>
        <button 
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '24px',
            color: '#6b7280'
          }}
        >
          &times;
        </button>
      </div>

      {/* Formularz */}
      <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Wybór kategorii */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Kategoria *
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="">Wybierz kategorię</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tytuł */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Tytuł dokumentu *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Wpisz tytuł dokumentu"
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Opis */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Opis (opcjonalnie)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Krótki opis dokumentu..."
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Upload pliku */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Plik *
          </label>
          
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? '#a3cd39' : '#d1d5db'}`,
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              backgroundColor: dragActive ? '#f0fdf4' : '#fafafa',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            {file ? (
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    backgroundColor: '#a3cd39',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {getFileTypeDisplay(file)}
                  </div>
                  <span style={{ fontSize: '14px' }}>{file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setTitle('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  marginTop: '8px' 
                }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="32" 
                    height="32" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="#a3cd39" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ margin: '0 auto' }}
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                  Przeciągnij plik tutaj lub <span style={{ color: '#a3cd39', fontWeight: 500 }}>kliknij aby wybrać</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Obsługiwane formaty: PDF, Excel, Word, TXT (max 10MB)
                </div>
              </div>
            )}
          </div>

          <input
            id="file-input"
            type="file"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0];
              if (selectedFile) {
                handleFileChange(selectedFile);
              }
            }}
            accept=".pdf,.xlsx,.xls,.docx,.doc,.txt"
            style={{ display: 'none' }}
          />
        </div>

        {/* Przyciski */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            style={{
              padding: '8px 16px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isUploading ? 0.6 : 1
            }}
          >
            Anuluj
          </button>
          
          <button
            type="submit"
            disabled={isUploading || !file || !title.trim() || !categoryId}
            style={{
              padding: '8px 16px',
              backgroundColor: '#a3cd39',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (isUploading || !file || !title.trim() || !categoryId) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: (isUploading || !file || !title.trim() || !categoryId) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isUploading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #ffffff40',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Przesyłanie...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Dodaj do biblioteki
              </>
            )}
          </button>
        </div>
      </form>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}