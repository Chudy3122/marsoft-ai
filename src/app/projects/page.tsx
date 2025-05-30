// src/app/projects/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Komponent do wgrywania dokumentów
function DocumentUploadPanel({ onDocumentAnalyzed }: { onDocumentAnalyzed: (result: any) => void }) {
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

// Komponent do wczytywania dokumentów
function DocumentUploader({ onCreateFromDocument }: { onCreateFromDocument: (documentId: string) => void }) {
  const [uploadedDocuments, setUploadedDocuments] = useState<{ id: string, title: string }[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Pobierz listę dokumentów z biblioteki wiedzy i czatów
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/documents/all');
        
        if (!response.ok) {
          throw new Error('Problem z pobraniem dokumentów');
        }
        
        const data = await response.json();
        setUploadedDocuments(data.documents || []);
      } catch (error) {
        console.error('Błąd podczas pobierania dokumentów:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocuments();
  }, []);

  const handleCreateFromDocument = () => {
    if (selectedDocumentId) {
      onCreateFromDocument(selectedDocumentId);
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
        Utwórz projekt z istniejącego dokumentu
      </h2>
      <p style={{ 
        fontSize: '14px', 
        color: '#6b7280', 
        marginBottom: '16px' 
      }}>
        System przeanalizuje wybrany dokument i automatycznie utworzy projekt z terminami i zadaniami.
      </p>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-end', 
        gap: '16px',
        marginBottom: '8px'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontSize: '14px', 
            fontWeight: 500,
            color: '#374151' 
          }}>
            Wybierz dokument
          </label>
          <select
            value={selectedDocumentId}
            onChange={(e) => setSelectedDocumentId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="">Wybierz dokument...</option>
            {uploadedDocuments.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.title}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={handleCreateFromDocument}
          disabled={!selectedDocumentId || isLoading}
          style={{
            padding: '10px 16px',
            backgroundColor: '#a3cd39',
            color: 'white',
            border: '1px solid #93b935',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: !selectedDocumentId || isLoading ? 'not-allowed' : 'pointer',
            opacity: !selectedDocumentId || isLoading ? 0.7 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isLoading ? 'Ładowanie...' : 'Utwórz projekt z dokumentu'}
        </button>
      </div>
      <p style={{ fontSize: '12px', color: '#6b7280' }}>
        Jeśli nie widzisz dokumentu, upewnij się, że został wcześniej wgrany do aplikacji.
      </p>
    </div>
  );
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  tasksCount?: number;
  milestonesCount?: number;
  progress?: number;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingFromDocument, setIsCreatingFromDocument] = useState(false);
  const [generationError, setGenerationError] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      
      if (!response.ok) {
        throw new Error('Problem z pobraniem projektów');
      }
      
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Błąd podczas pobierania projektów:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  const handleCreateFromDocument = async (documentId: string) => {
    try {
      setIsCreatingFromDocument(true);
      setGenerationError('');
      
      const response = await fetch('/api/projects/generate-from-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Wystąpił problem podczas generowania projektu');
      }
      
      const data = await response.json();
      
      // Odśwież listę projektów
      fetchProjects();
      
      // Przekieruj do nowo utworzonego projektu
      if (data.project && data.project.id) {
        router.push(`/projects/${data.project.id}`);
      }
    } catch (error) {
      console.error('Błąd podczas generowania projektu z dokumentu:', error);
      setGenerationError((error as Error).message || 'Wystąpił nieoczekiwany błąd.');
    } finally {
      setIsCreatingFromDocument(false);
    }
  };
  
  const handleDocumentAnalyzed = (result: any) => {
    // Odśwież listę projektów
    fetchProjects();
    
    // Przekieruj do nowo utworzonego projektu
    if (result.project && result.project.id) {
      router.push(`/projects/${result.project.id}`);
    }
  };

  return (
    <div className="projects-page" style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto' 
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
            Harmonogramy projektów
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Zarządzaj harmonogramami i terminami projektów
          </p>
        </div>
        
        <div>
          <button
            onClick={() => {
              router.push('/');
            }}
            style={{
              padding: '8px 12px',
              marginRight: '8px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Powrót
          </button>
          
          <button
            onClick={() => {
              router.push('/projects/new');
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#a3cd39',
              color: 'white',
              border: '1px solid #93b935',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Nowy projekt
          </button>
        </div>
      </div>
      
      {/* Sekcja wgrywania i analizy dokumentu */}
      <DocumentUploadPanel onDocumentAnalyzed={handleDocumentAnalyzed} />
      
      {/* Istniejący komponent do wyboru z biblioteki */}
      <DocumentUploader onCreateFromDocument={handleCreateFromDocument} />
      
      {/* Informacja o błędzie */}
      {generationError && (
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#fee2e2', 
          color: '#b91c1c', 
          borderRadius: '6px',
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          {generationError}
        </div>
      )}
      
      {/* Wskaźnik ładowania podczas generowania */}
      {isCreatingFromDocument && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f0f9ff', 
          borderRadius: '6px',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#0369a1',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ 
            width: '20px',
            height: '20px',
            border: '3px solid rgba(3,105,161,0.2)',
            borderRadius: '50%',
            borderTopColor: '#0369a1',
            animation: 'spin 1s linear infinite'
          }}></div>
          Trwa analizowanie dokumentu i tworzenie projektu... To może potrwać kilka chwil.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ 
            display: 'inline-block',
            width: '30px',
            height: '30px',
            border: '3px solid #f3f4f6',
            borderRadius: '50%',
            borderTopColor: '#a3cd39',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ marginTop: '12px', color: '#6b7280' }}>Ładowanie projektów...</p>
        </div>
      ) : projects.length === 0 ? (
        <div style={{ 
          padding: '60px 0',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px dashed #d1d5db'
        }}>
          <div style={{ 
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'rgba(163, 205, 57, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#a3cd39" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>
            Brak projektów
          </h2>
          <p style={{ color: '#6b7280', maxWidth: '400px', margin: '0 auto 24px' }}>
            Nie masz jeszcze żadnych projektów. Stwórz nowy projekt, aby zarządzać jego harmonogramem i terminami, lub wygeneruj projekt automatycznie z dokumentu.
          </p>
          <button
            onClick={() => router.push('/projects/new')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#a3cd39',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Utwórz nowy projekt
          </button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px' 
        }}>
          {projects.map(project => (
            <div
              key={project.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onClick={() => router.push(`/projects/${project.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.borderColor = '#a3cd39';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                {project.name}
              </h3>
              
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                {project.description || 'Brak opisu'}
              </div>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '16px',
                fontSize: '12px',
                color: '#6b7280' 
              }}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{ marginRight: '4px' }}
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {formatDate(project.startDate)} - {formatDate(project.endDate)}
              </div>
              
              {/* Pasek postępu */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  marginBottom: '4px' 
                }}>
                  <span>Postęp</span>
                  <span>{project.progress || 0}%</span>
                </div>
                <div style={{ 
                  height: '6px', 
                  backgroundColor: '#f3f4f6',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${project.progress || 0}%`,
                    backgroundColor: '#a3cd39',
                    borderRadius: '3px'
                  }}></div>
                </div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                borderTop: '1px solid #f3f4f6',
                paddingTop: '12px',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{project.tasksCount || 0}</span> zadań
                </div>
                <div>
                  <span style={{ fontWeight: 500 }}>{project.milestonesCount || 0}</span> kamieni milowych
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}