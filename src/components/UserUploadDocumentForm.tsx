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
            transform: translateX(-50px) translateY(-25px) scale(0);
            opacity: 0;
          }
          50% { 
            opacity: 1;
            transform: translateX(250px) translateY(0px) scale(1);
          }
          100% { 
            transform: translateX(550px) translateY(25px) scale(0);
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
          0% { stroke-dashoffset: 500; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }

        .upload-form-container {
          animation: slideInUp 0.6s ease-out;
        }
        
        .form-field {
          animation: fadeInUp 0.4s ease-out forwards;
          opacity: 0;
        }
        
        .form-field:nth-child(1) { animation-delay: 0.1s; }
        .form-field:nth-child(2) { animation-delay: 0.15s; }
        .form-field:nth-child(3) { animation-delay: 0.2s; }
        .form-field:nth-child(4) { animation-delay: 0.25s; }
        .form-field:nth-child(5) { animation-delay: 0.3s; }
        
        .ai-particle {
          animation: networkFlow 6s ease-in-out infinite;
        }
        
        .ai-particle:nth-child(1) { animation-delay: 0s; }
        .ai-particle:nth-child(2) { animation-delay: 2s; }
        .ai-particle:nth-child(3) { animation-delay: 4s; }
        
        .ai-node {
          animation: aiPulse 4s ease-in-out infinite;
        }
        
        .ai-node:nth-child(odd) { animation-delay: 2s; }
        
        .circuit-line {
          animation: circuitTrace 8s ease-in-out infinite;
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
        
        .drag-hover:hover {
          border-color: rgba(163, 205, 57, 0.6) !important;
          background: rgba(163, 205, 57, 0.05) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(163, 205, 57, 0.15);
        }
      `}</style>
      
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 50%, #1a202c 100%)',
        borderRadius: '20px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        width: '550px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflow: 'hidden',
        border: '1px solid rgba(163, 205, 57, 0.2)',
        position: 'relative',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }} className="upload-form-container">
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
            <pattern id="circuit-upload" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M12 12h36v36h-36z" fill="none" stroke="#a3cd39" strokeWidth="0.5"/>
              <circle cx="12" cy="12" r="1.5" fill="#a3cd39"/>
              <circle cx="48" cy="12" r="1.5" fill="#a3cd39"/>
              <circle cx="12" cy="48" r="1.5" fill="#a3cd39"/>
              <circle cx="48" cy="48" r="1.5" fill="#a3cd39"/>
              <path d="M12 12L48 48M48 12L12 48" stroke="#a3cd39" strokeWidth="0.3" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit-upload)"/>
          
          <path 
            className="circuit-line"
            d="M0,30 Q120,15 240,30 T480,30" 
            fill="none" 
            stroke="#a3cd39" 
            strokeWidth="1.5" 
            strokeDasharray="8,4"
            opacity="0.1"
          />
          <path 
            className="circuit-line"
            d="M0,90 Q180,75 360,90 T720,90" 
            fill="none" 
            stroke="#a3cd39" 
            strokeWidth="1" 
            strokeDasharray="6,3"
            opacity="0.08"
            style={{ animationDelay: '2s' }}
          />
        </svg>
        
        {/* AI Data particles flowing */}
        <div className="ai-particle" style={{
          position: 'absolute',
          width: '2px',
          height: '2px',
          background: '#a3cd39',
          borderRadius: '50%',
          top: '20%',
          left: 0,
          zIndex: 1,
          boxShadow: '0 0 6px #a3cd39',
          opacity: 0.4
        }} />
        <div className="ai-particle" style={{
          position: 'absolute',
          width: '1.5px',
          height: '1.5px',
          background: '#8bc34a',
          borderRadius: '50%',
          top: '50%',
          left: 0,
          zIndex: 1,
          boxShadow: '0 0 4px #8bc34a',
          opacity: 0.3
        }} />
        <div className="ai-particle" style={{
          position: 'absolute',
          width: '2px',
          height: '2px',
          background: '#a3cd39',
          borderRadius: '50%',
          top: '80%',
          left: 0,
          zIndex: 1,
          boxShadow: '0 0 6px #a3cd39',
          opacity: 0.4
        }} />
        
        {/* Neural network nodes */}
        <div className="ai-node" style={{
          position: 'absolute',
          width: '6px',
          height: '6px',
          background: 'radial-gradient(circle, #a3cd39, #8bc34a)',
          borderRadius: '50%',
          top: '15%',
          left: '8%',
          zIndex: 1,
          boxShadow: '0 0 8px #a3cd39',
          opacity: 0.3
        }} />
        <div className="ai-node" style={{
          position: 'absolute',
          width: '4px',
          height: '4px',
          background: 'radial-gradient(circle, #8bc34a, #a3cd39)',
          borderRadius: '50%',
          top: '70%',
          right: '10%',
          zIndex: 1,
          boxShadow: '0 0 6px #8bc34a',
          opacity: 0.2
        }} />

        {/* Nagłówek */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid rgba(163, 205, 57, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(163, 205, 57, 0.2), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(163, 205, 57, 0.3)'
            }}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#a3cd39" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <h2 style={{ 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: 700, 
              color: 'white',
              background: 'linear-gradient(135deg, #a3cd39, #8bc34a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Dodaj dokument do biblioteki
            </h2>
          </div>
          
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

        {/* Formularz */}
        <div style={{ 
          padding: '28px', 
          maxHeight: 'calc(90vh - 120px)', 
          overflowY: 'auto',
          position: 'relative',
          zIndex: 10 
        }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                padding: '12px 16px',
                borderRadius: '10px',
                marginBottom: '20px',
                fontSize: '14px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                {error}
              </div>
            )}

            {/* Wybór kategorii */}
            <div className="form-field" style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 600,
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                Kategoria *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
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
                  backdropFilter: 'blur(10px)',
                  boxSizing: 'border-box'
                }}
              >
                <option value="" style={{ color: '#333' }}>Wybierz kategorię</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id} style={{ color: '#333' }}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tytuł */}
            <div className="form-field" style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 600,
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                Tytuł dokumentu *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Wpisz tytuł dokumentu"
                required
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
                  backdropFilter: 'blur(10px)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Opis */}
            <div className="form-field" style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 600,
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                Opis (opcjonalnie)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Krótki opis dokumentu..."
                rows={3}
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
                  backdropFilter: 'blur(10px)',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Upload pliku */}
            <div className="form-field" style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 600,
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                Plik *
              </label>
              
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className="drag-hover"
                style={{
                  border: `2px dashed ${dragActive ? '#a3cd39' : 'rgba(255, 255, 255, 0.2)'}`,
                  borderRadius: '12px',
                  padding: '32px 24px',
                  textAlign: 'center',
                  backgroundColor: dragActive ? 'rgba(163, 205, 57, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)'
                }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                {file ? (
                  <div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(163, 205, 57, 0.3)',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #a3cd39, #8bc34a)',
                        color: '#1a1a1a',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}>
                        {getFileTypeDisplay(file)}
                      </div>
                      <span style={{ fontSize: '14px', color: 'white', fontWeight: 500 }}>{file.name}</span>
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
                          color: 'rgba(255, 255, 255, 0.6)',
                          cursor: 'pointer',
                          fontSize: '18px',
                          padding: '2px',
                          borderRadius: '4px',
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
                        ×
                      </button>
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: 'rgba(255, 255, 255, 0.5)', 
                      marginTop: '12px' 
                    }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: '16px' }}>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="40" 
                        height="40" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="#a3cd39" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        style={{ margin: '0 auto', filter: 'drop-shadow(0 0 8px rgba(163, 205, 57, 0.3))' }}
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                    </div>
                    <div style={{ fontSize: '18px', marginBottom: '8px', color: 'white', fontWeight: 600 }}>
                      Przeciągnij plik tutaj lub <span style={{ color: '#a3cd39', fontWeight: 700 }}>kliknij aby wybrać</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
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
            <div className="form-field" style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '16px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(163, 205, 57, 0.2)'
            }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: isUploading ? 0.6 : 1,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  if (!isUploading) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isUploading) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                Anuluj
              </button>
              
              <button
                type="submit"
                disabled={isUploading || !file || !title.trim() || !categoryId}
                className="button-hover"
                style={{
                  padding: '12px 24px',
                  background: (isUploading || !file || !title.trim() || !categoryId) 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'linear-gradient(135deg, #a3cd39 0%, #8bc34a 100%)',
                  color: (isUploading || !file || !title.trim() || !categoryId) ? 'rgba(255, 255, 255, 0.4)' : '#1a1a1a',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: (isUploading || !file || !title.trim() || !categoryId) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: (isUploading || !file || !title.trim() || !categoryId) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: (isUploading || !file || !title.trim() || !categoryId) 
                    ? 'none' 
                    : '0 4px 15px rgba(163, 205, 57, 0.3)'
                }}
              >
                {isUploading ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(26, 26, 26, 0.3)',
                      borderTop: '2px solid #1a1a1a',
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
        </div>
      </div>
    </>
  );
}