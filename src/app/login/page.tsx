'use client';

// src/app/login/page.tsx
import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
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
  const { data: session, status } = useSession();
  
  useEffect(() => {
    if (status === "authenticated" && session) {
      console.log("Użytkownik już zalogowany, przekierowuję na stronę główną");
      router.push('/');
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDebugInfo(null);

    console.log("Próba logowania:", { email, password: '********' });
    
    try {
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

  if (status === "loading") {
    return (
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f9f9f9'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh',
      backgroundColor: '#f9f9f9',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Ozdobne elementy tła */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(163,205,57,0.1) 0%, rgba(163,205,57,0.05) 70%, rgba(163,205,57,0) 100%)',
        top: '-100px',
        left: '-100px',
        zIndex: 0
      }} />
      
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(163,205,57,0.08) 0%, rgba(163,205,57,0.04) 70%, rgba(163,205,57,0) 100%)',
        bottom: '-150px',
        right: '-150px',
        zIndex: 0
      }} />
      
      <div style={{
        position: 'absolute',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        backgroundColor: 'rgba(163,205,57,0.1)',
        top: '20%',
        right: '15%',
        zIndex: 0
      }} />
      
      <div style={{
        position: 'absolute',
        width: '35px',
        height: '35px',
        borderRadius: '50%',
        backgroundColor: 'rgba(163,205,57,0.1)',
        bottom: '25%',
        left: '10%',
        zIndex: 0
      }} />

      <div style={{
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Lewa kolumna z formularzem */}
        <div style={{ 
          flex: '1',
          minWidth: '300px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '2rem',
          position: 'relative'
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
                  transition: 'opacity 0.2s, transform 0.2s',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  transform: loading ? 'scale(0.98)' : 'scale(1)'
                }}
              >
                {loading ? 'Logowanie...' : 'Zaloguj się'}
              </button>
            </form>

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

        {/* Separator między kolumnami */}
        <div style={{
          width: '1px',
          margin: '2rem 0',
          background: 'linear-gradient(to bottom, rgba(163,205,57,0), rgba(163,205,57,0.3) 30%, rgba(163,205,57,0.3) 70%, rgba(163,205,57,0))',
          alignSelf: 'stretch',
          position: 'relative',
          zIndex: 2
        }}>
          {/* Kropki na separatorze */}
          <div style={{
            position: 'absolute',
            width: '10px',
            height: '10px',
            backgroundColor: '#a3cd39',
            borderRadius: '50%',
            top: '25%',
            left: '-4.5px'
          }} />
          <div style={{
            position: 'absolute',
            width: '10px',
            height: '10px',
            backgroundColor: '#a3cd39',
            borderRadius: '50%',
            top: '50%',
            left: '-4.5px'
          }} />
          <div style={{
            position: 'absolute',
            width: '10px',
            height: '10px',
            backgroundColor: '#a3cd39',
            borderRadius: '50%',
            top: '75%',
            left: '-4.5px'
          }} />
        </div>

        {/* Prawa kolumna z logo i grafiką */}
        <div style={{ 
          flex: '1',
          minWidth: '300px',
          backgroundColor: '#f9f9f9',
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
            
            <p style={{ 
              fontSize: '18px',
              color: '#6b7280',
              maxWidth: '400px',
              marginBottom: '24px'
            }}>
              Twój inteligentny asystent do tworzenia i zarządzania dokumentacją projektów UE.
            </p>
            
            {/* Funkcje asystenta */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              textAlign: 'left',
              marginTop: '16px',
              padding: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{ 
                fontSize: '16px', 
                color: '#4b5563', 
                fontWeight: '600',
                marginBottom: '4px'
              }}>
                Asystent MarsoftAI pomoże Ci:
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: '#a3cd39', 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                </div>
                <span style={{ fontSize: '14px', color: '#4b5563' }}>Tworzyć profesjonalną dokumentację projektową</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: '#a3cd39', 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                </div>
                <span style={{ fontSize: '14px', color: '#4b5563' }}>Analizować i generować harmonogramy</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: '#a3cd39', 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                </div>
                <span style={{ fontSize: '14px', color: '#4b5563' }}>Przygotować budżety i zestawienia finansowe</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: '#a3cd39', 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                </div>
                <span style={{ fontSize: '14px', color: '#4b5563' }}>Odpowiadać na pytania o fundusze europejskie</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stopka */}
      <div style={{ 
        textAlign: 'center', 
        padding: '12px',
        borderTop: '1px solid #e5e7eb',
        color: '#9ca3af',
        fontSize: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.5)'
      }}>
        &copy; {new Date().getFullYear()} MarsoftAI - Wszelkie prawa zastrzeżone
      </div>
    </div>
  );
}