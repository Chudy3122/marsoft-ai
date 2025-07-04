// src/components/CreateCategoryForm.tsx - PEŁNA WERSJA z publiczne/prywatne i hasłami
'use client';

import { useState } from 'react';

interface CreateCategoryFormProps {
  onClose: () => void;
  onCategoryCreated: () => void;
}

export default function CreateCategoryForm({ onClose, onCategoryCreated }: CreateCategoryFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Nazwa kategorii jest wymagana.');
      return;
    }

    // Sprawdź hasła jeśli kategoria ma być chroniona hasłem
    if (password && password !== confirmPassword) {
      setError('Hasła nie są identyczne.');
      return;
    }

    // Sprawdź siłę hasła jeśli zostało podane
    if (password && password.length < 4) {
      setError('Hasło musi mieć co najmniej 4 znaki.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      console.log('Tworzenie kategorii:', { name, isPublic, hasPassword: !!password });

      const response = await fetch('/api/knowledge/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          isPublic,
          password: password || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas tworzenia kategorii');
      }

      const result = await response.json();
      console.log('Kategoria utworzona pomyślnie:', result);

      // Powiadom o utworzeniu kategorii
      onCategoryCreated();
      onClose();

    } catch (error) {
      console.error('Błąd podczas tworzenia kategorii:', error);
      setError(error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd');
    } finally {
      setIsCreating(false);
    }
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

        .category-form-container {
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
        .form-field:nth-child(6) { animation-delay: 0.35s; }
        
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
        
        .radio-option:hover {
          background: rgba(163, 205, 57, 0.1) !important;
          border-color: rgba(163, 205, 57, 0.4) !important;
          transform: translateY(-1px);
        }
      `}</style>
      
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 50%, #1a202c 100%)',
        borderRadius: '20px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        width: '580px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflow: 'hidden',
        border: '1px solid rgba(163, 205, 57, 0.2)',
        position: 'relative',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }} className="category-form-container">
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
            <pattern id="circuit-category" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M12 12h36v36h-36z" fill="none" stroke="#a3cd39" strokeWidth="0.5"/>
              <circle cx="12" cy="12" r="1.5" fill="#a3cd39"/>
              <circle cx="48" cy="12" r="1.5" fill="#a3cd39"/>
              <circle cx="12" cy="48" r="1.5" fill="#a3cd39"/>
              <circle cx="48" cy="48" r="1.5" fill="#a3cd39"/>
              <path d="M12 12L48 48M48 12L12 48" stroke="#a3cd39" strokeWidth="0.3" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit-category)"/>
          
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
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
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
              Utwórz nową kategorię
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

            {/* Nazwa kategorii */}
            <div className="form-field" style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 600,
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                Nazwa kategorii *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Projekty UE, Dokumentacja techniczna..."
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
            <div className="form-field" style={{ marginBottom: '24px' }}>
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
                placeholder="Krótki opis kategorii..."
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

            {/* Typ kategorii */}
            <div className="form-field" style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '12px', 
                fontWeight: 600,
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                Dostępność kategorii
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label 
                  className="radio-option"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: isPublic ? 'rgba(163, 205, 57, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: isPublic ? '2px solid rgba(163, 205, 57, 0.4)' : '2px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <input
                    type="radio"
                    name="visibility"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                    style={{ 
                      marginRight: '16px', 
                      transform: 'scale(1.3)',
                      accentColor: '#a3cd39'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: 700, 
                      fontSize: '16px', 
                      marginBottom: '6px',
                      color: 'white'
                    }}>
                      🌍 Publiczna kategoria
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: 'rgba(255, 255, 255, 0.6)',
                      lineHeight: '1.4'
                    }}>
                      Wszyscy użytkownicy mogą widzieć kategorię i dodawać do niej dokumenty
                    </div>
                  </div>
                </label>
                
                <label 
                  className="radio-option"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: !isPublic ? 'rgba(163, 205, 57, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: !isPublic ? '2px solid rgba(163, 205, 57, 0.4)' : '2px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <input
                    type="radio"
                    name="visibility"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                    style={{ 
                      marginRight: '16px', 
                      transform: 'scale(1.3)',
                      accentColor: '#a3cd39'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: 700, 
                      fontSize: '16px', 
                      marginBottom: '6px',
                      color: 'white'
                    }}>
                      🔒 Prywatna kategoria
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: 'rgba(255, 255, 255, 0.6)',
                      lineHeight: '1.4'
                    }}>
                      Tylko Ty możesz widzieć kategorię i dodawać do niej dokumenty
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Hasło (opcjonalne) */}
            <div className="form-field" style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 600,
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                🔑 Hasło dostępu (opcjonalne)
              </label>
              <div style={{ 
                fontSize: '13px', 
                color: 'rgba(255, 255, 255, 0.6)', 
                marginBottom: '16px',
                padding: '12px 16px',
                backgroundColor: 'rgba(163, 205, 57, 0.1)',
                borderRadius: '10px',
                border: '1px solid rgba(163, 205, 57, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                💡 Jeśli ustawisz hasło, użytkownicy będą musieli je podać aby uzyskać dostęp do kategorii
              </div>
              
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Zostaw puste jeśli nie chcesz hasła"
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
                  marginBottom: '12px',
                  boxSizing: 'border-box'
                }}
              />
              
              {password && (
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Potwierdź hasło"
                  className="input-focus"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${password === confirmPassword ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
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
              )}
              
              {password && password !== confirmPassword && confirmPassword && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#ef4444', 
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  ❌ Hasła nie są identyczne
                </div>
              )}
              
              {password && password === confirmPassword && confirmPassword && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#22c55e', 
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  ✅ Hasła są identyczne
                </div>
              )}
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
                disabled={isCreating}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: isCreating ? 0.6 : 1,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  if (!isCreating) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCreating) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                Anuluj
              </button>
              
              <button
                type="submit"
                disabled={
                  isCreating || 
                  !name.trim() || 
                  (password.length > 0 && password !== confirmPassword)
                }
                className="button-hover"
                style={{
                  padding: '12px 24px',
                  background: (
                    isCreating || 
                    !name.trim() || 
                    (password.length > 0 && password !== confirmPassword)
                  ) ? 'rgba(255, 255, 255, 0.1)' 
                    : 'linear-gradient(135deg, #a3cd39 0%, #8bc34a 100%)',
                  color: (
                    isCreating || 
                    !name.trim() || 
                    (password.length > 0 && password !== confirmPassword)
                  ) ? 'rgba(255, 255, 255, 0.4)' : '#1a1a1a',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: (
                    isCreating || 
                    !name.trim() || 
                    (password.length > 0 && password !== confirmPassword)
                  ) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: (
                    isCreating || 
                    !name.trim() || 
                    (password.length > 0 && password !== confirmPassword)
                  ) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: (
                    isCreating || 
                    !name.trim() || 
                    (password.length > 0 && password !== confirmPassword)
                  ) ? 'none' 
                    : '0 4px 15px rgba(163, 205, 57, 0.3)'
                }}
              >
                {isCreating ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(26, 26, 26, 0.3)',
                      borderTop: '2px solid #1a1a1a',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Tworzenie...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Utwórz kategorię
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