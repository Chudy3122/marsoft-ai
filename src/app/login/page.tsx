'use client';

// src/app/login/page.tsx
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import React from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDebugInfo(null);

    console.log("Próba logowania:", { email, password: '********' });
    
    try {
      // Bezpośrednie logowanie przez NextAuth
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        callbackUrl: '/'
      });

      console.log("Rezultat logowania:", result);
      setDebugInfo(result);
      
      if (result?.error) {
        console.error("Błąd logowania:", result.error);
        setError(`Nieprawidłowy login lub hasło (${result.error})`);
        setLoading(false);
      } else if (result?.url) {
        console.log("Logowanie udane, przekierowanie do:", result.url);
        router.push(result.url);
      } else {
        console.log("Logowanie udane, przekierowanie do strony głównej");
        router.push('/');
      }
    } catch (error) {
      console.error('Błąd podczas logowania:', error);
      setError(`Wystąpił problem z logowaniem: ${error instanceof Error ? error.message : String(error)}`);
      setDebugInfo({ error: String(error) });
      setLoading(false);
    }
  };

  // Funkcja do szybkiego wypełnienia danych testowych
  const fillTestCredentials = (userType: 'admin' | 'user') => {
    if (userType === 'admin') {
      setEmail('admin@marsoft.pl');
      setPassword('admin123');
    } else {
      setEmail('user@marsoft.pl');
      setPassword('test123');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh',
      backgroundColor: '#f9f9f9',
      flexDirection: 'column'  // Zmieniamy na kolumnę na małych ekranach
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        flexWrap: 'wrap'  // Pozwala na zawijanie na mniejszych ekranach
      }}>
        {/* Lewa kolumna z formularzem */}
        <div style={{ 
          flex: '1',
          minWidth: '300px',  // Minimalna szerokość
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{ 
            maxWidth: '400px',
            margin: '0 auto',
            width: '100%'
          }}>
            <h1 style={{ 
              fontSize: '28px',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#333d3d'
            }}>
              Zaloguj się do MarsoftAI
            </h1>
            <p style={{ 
              fontSize: '16px',
              color: '#6b7280',
              marginBottom: '24px'
            }}>
              Asystent dla projektów UE
            </p>

            {error && (
              <div style={{ 
                padding: '12px',
                backgroundColor: '#fee2e2',
                borderRadius: '6px',
                color: '#b91c1c',
                marginBottom: '16px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label 
                  htmlFor="email" 
                  style={{ 
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '6px',
                    color: '#4b5563'
                  }}
                >
                  Adres Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Twój email"
                  required
                  style={{ 
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label 
                  htmlFor="password" 
                  style={{ 
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '6px',
                    color: '#4b5563'
                  }}
                >
                  Hasło
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Twoje hasło"
                  required
                  style={{ 
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  <label htmlFor="remember" style={{ fontSize: '14px', color: '#4b5563' }}>
                    Zapamiętaj mnie
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ 
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#a3cd39',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {loading ? 'Logowanie...' : 'Zaloguj się'}
              </button>
            </form>

            <div style={{ 
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#f3f4f6',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#4b5563'
            }}>
              <p style={{ marginBottom: '8px', fontWeight: '500' }}>
                Dane testowe:
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => fillTestCredentials('admin')}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#e5e7eb',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  admin@marsoft.pl / admin123
                </button>
                <button
                  onClick={() => fillTestCredentials('user')}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#e5e7eb',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  user@marsoft.pl / test123
                </button>
              </div>
            </div>

            {/* Obszar informacji debugowania - pomocny przy rozwiązywaniu problemów */}
            {debugInfo && (
              <div style={{ 
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#f0f9ff',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#0369a1'
              }}>
                <p style={{ marginBottom: '8px', fontWeight: '500' }}>
                  Informacje diagnostyczne:
                </p>
                <pre style={{ 
                  whiteSpace: 'pre-wrap', 
                  wordBreak: 'break-all',
                  fontSize: '12px',
                  backgroundColor: '#f8fafc',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #e0f2fe',
                  maxHeight: '150px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Prawa kolumna z logo i grafiką */}
        <div style={{ 
          flex: '1',
          minWidth: '300px',  // Minimalna szerokość
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          position: 'relative'
        }}>
          <div style={{ 
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <div style={{ 
              width: '300px',
              height: '300px',
              position: 'relative',
              margin: '0 auto 24px auto'
            }}>
              <Image
                src="/MarsoftAI.png"
                alt="MarsoftAI Logo"
                fill
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
            <h2 style={{ 
              fontSize: '36px',
              fontWeight: '700',
              color: '#333d3d',
              marginBottom: '16px'
            }}>
              
            </h2>
            <p style={{ 
              fontSize: '18px',
              color: '#6b7280',
              maxWidth: '400px'
            }}>
              Twój inteligentny asystent do tworzenia i zarządzania dokumentacją projektów UE.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}