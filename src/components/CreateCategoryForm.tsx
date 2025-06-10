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
          Utwórz nową kategorię
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

        {/* Nazwa kategorii */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Nazwa kategorii *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Projekty UE, Dokumentacja techniczna..."
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
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
            placeholder="Krótki opis kategorii..."
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Typ kategorii */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            Dostępność kategorii
          </label>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: isPublic ? '#f0fdf4' : '#f9fafb',
              border: isPublic ? '2px solid #a3cd39' : '2px solid #e5e7eb',
              transition: 'all 0.2s'
            }}>
              <input
                type="radio"
                name="visibility"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                style={{ marginRight: '12px', transform: 'scale(1.2)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
                  🌍 Publiczna kategoria
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Wszyscy użytkownicy mogą widzieć kategorię i dodawać do niej dokumenty
                </div>
              </div>
            </label>
            
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: !isPublic ? '#f0fdf4' : '#f9fafb',
              border: !isPublic ? '2px solid #a3cd39' : '2px solid #e5e7eb',
              transition: 'all 0.2s'
            }}>
              <input
                type="radio"
                name="visibility"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                style={{ marginRight: '12px', transform: 'scale(1.2)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
                  🔒 Prywatna kategoria
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Tylko Ty możesz widzieć kategorię i dodawać do niej dokumenty
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Hasło (opcjonalne) */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontWeight: 500,
            fontSize: '14px'
          }}>
            🔑 Hasło dostępu (opcjonalne)
          </label>
          <div style={{ 
            fontSize: '13px', 
            color: '#6b7280', 
            marginBottom: '12px',
            padding: '8px',
            backgroundColor: '#f3f4f6',
            borderRadius: '6px'
          }}>
            💡 Jeśli ustawisz hasło, użytkownicy będą musieli je podać aby uzyskać dostęp do kategorii
          </div>
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Zostaw puste jeśli nie chcesz hasła"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              marginBottom: '10px',
              boxSizing: 'border-box'
            }}
          />
          
          {password && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Potwierdź hasło"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${password === confirmPassword ? '#10b981' : '#ef4444'}`,
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          )}
          
          {password && password !== confirmPassword && confirmPassword && (
            <div style={{ 
              fontSize: '12px', 
              color: '#ef4444', 
              marginTop: '4px' 
            }}>
              ❌ Hasła nie są identyczne
            </div>
          )}
          
          {password && password === confirmPassword && confirmPassword && (
            <div style={{ 
              fontSize: '12px', 
              color: '#10b981', 
              marginTop: '4px' 
            }}>
              ✅ Hasła są identyczne
            </div>
          )}
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
            disabled={isCreating}
            style={{
              padding: '10px 20px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isCreating ? 0.6 : 1,
              transition: 'all 0.2s'
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
            style={{
              padding: '10px 20px',
              backgroundColor: '#a3cd39',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
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
              transition: 'all 0.2s'
            }}
          >
            {isCreating ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #ffffff40',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Tworzenie...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Utwórz kategorię
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