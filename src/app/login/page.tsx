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
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();
  
  useEffect(() => {
    setMounted(true);
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

  if (status === "loading" || !mounted) {
    return (
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}>
        <div style={{ 
          textAlign: 'center',
          padding: '3rem',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(163, 205, 57, 0.2)'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(163, 205, 57, 0.2)',
            borderTop: '4px solid #a3cd39',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1.5rem'
          }} />
          <p style={{ 
            fontSize: '20px', 
            fontWeight: '600',
            color: 'white',
            margin: 0
          }}>
            Ładowanie...
          </p>
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
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
            transform: translateX(-100px) translateY(-50px) scale(0);
            opacity: 0;
          }
          50% { 
            opacity: 1;
            transform: translateX(50vw) translateY(0px) scale(1);
          }
          100% { 
            transform: translateX(100vw) translateY(50px) scale(0);
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
        
        @keyframes dataStream {
          0% { 
            transform: translateY(100vh) scaleY(0);
            opacity: 0;
          }
          20% { 
            opacity: 1;
            transform: translateY(80vh) scaleY(1);
          }
          80% { 
            opacity: 1;
            transform: translateY(20vh) scaleY(1);
          }
          100% { 
            transform: translateY(-20vh) scaleY(0);
            opacity: 0;
          }
        }
        
        @keyframes geometricFloat {
          0%, 100% { 
            transform: translateY(0px);
            opacity: 0.3;
          }
          50% { 
            transform: translateY(-10px);
            opacity: 0.6;
          }
        }
        
        @keyframes hexagonPulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.4;
          }
          50% { 
            transform: scale(1.05);
            opacity: 0.7;
          }
        }
        
        @keyframes circuitTrace {
          0% { stroke-dashoffset: 1000; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }

        .form-container {
          animation: slideInLeft 0.8s ease-out;
        }
        
        .info-container {
          animation: slideInRight 0.8s ease-out;
        }
        
        .form-group {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
        }
        
        .form-group:nth-child(1) { animation-delay: 0.1s; }
        .form-group:nth-child(2) { animation-delay: 0.2s; }
        .form-group:nth-child(3) { animation-delay: 0.3s; }
        .form-group:nth-child(4) { animation-delay: 0.4s; }
        
        .ai-particle {
          animation: networkFlow 8s ease-in-out infinite;
        }
        
        .ai-particle:nth-child(1) { animation-delay: 0s; }
        .ai-particle:nth-child(2) { animation-delay: 2s; }
        .ai-particle:nth-child(3) { animation-delay: 4s; }
        .ai-particle:nth-child(4) { animation-delay: 6s; }
        
        .ai-node {
          animation: aiPulse 4s ease-in-out infinite;
        }
        
        .ai-node:nth-child(odd) { animation-delay: 2s; }
        
        .data-stream {
          animation: dataStream 6s ease-in-out infinite;
        }
        
        .data-stream:nth-child(1) { animation-delay: 0s; }
        .data-stream:nth-child(2) { animation-delay: 1s; }
        .data-stream:nth-child(3) { animation-delay: 2s; }
        .data-stream:nth-child(4) { animation-delay: 3s; }
        .data-stream:nth-child(5) { animation-delay: 4s; }
        
        .geometric-shape {
          animation: geometricFloat 8s ease-in-out infinite;
        }
        
        .geometric-shape:nth-child(even) { animation-delay: 4s; }
        
        .hexagon-ai {
          animation: hexagonPulse 6s ease-in-out infinite;
        }
        
        .circuit-line {
          animation: circuitTrace 10s ease-in-out infinite;
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
        
        .feature-item {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .feature-item:hover {
          transform: translateX(8px);
          background: rgba(163, 205, 57, 0.1);
          border-radius: 12px;
          padding: 8px 12px;
        }
      `}</style>
      
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 50%, #1a202c 100%)',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}>
        {/* AI Neural Network Background */}
        <svg style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          opacity: 0.05
        }}>
          {/* Circuit board pattern */}
          <defs>
            <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M20 20h60v60h-60z" fill="none" stroke="#a3cd39" strokeWidth="0.5"/>
              <circle cx="20" cy="20" r="2" fill="#a3cd39"/>
              <circle cx="80" cy="20" r="2" fill="#a3cd39"/>
              <circle cx="20" cy="80" r="2" fill="#a3cd39"/>
              <circle cx="80" cy="80" r="2" fill="#a3cd39"/>
              <path d="M20 20L80 80M80 20L20 80" stroke="#a3cd39" strokeWidth="0.3" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit)"/>
          
          {/* Animated circuit traces */}
          <path 
            className="circuit-line"
            d="M0,50 Q200,20 400,50 T800,50" 
            fill="none" 
            stroke="#a3cd39" 
            strokeWidth="2" 
            strokeDasharray="10,5"
            opacity="0.2"
          />
          <path 
            className="circuit-line"
            d="M0,150 Q300,120 600,150 T1200,150" 
            fill="none" 
            stroke="#a3cd39" 
            strokeWidth="1.5" 
            strokeDasharray="8,3"
            opacity="0.15"
            style={{ animationDelay: '3s' }}
          />
        </svg>
        
        {/* AI Data particles flowing - zmniejszone i bardziej rozproszone */}
        <div className="ai-particle" style={{
          position: 'absolute',
          width: '3px',
          height: '3px',
          background: '#a3cd39',
          borderRadius: '50%',
          top: '15%',
          left: 0,
          zIndex: 1,
          boxShadow: '0 0 8px #a3cd39',
          opacity: 0.6
        }} />
        <div className="ai-particle" style={{
          position: 'absolute',
          width: '2px',
          height: '2px',
          background: '#8bc34a',
          borderRadius: '50%',
          top: '45%',
          left: 0,
          zIndex: 1,
          boxShadow: '0 0 6px #8bc34a',
          opacity: 0.5
        }} />
        <div className="ai-particle" style={{
          position: 'absolute',
          width: '3px',
          height: '3px',
          background: '#a3cd39',
          borderRadius: '50%',
          top: '75%',
          left: 0,
          zIndex: 1,
          boxShadow: '0 0 8px #a3cd39',
          opacity: 0.6
        }} />
        
        {/* Neural network nodes - przesunięte dalej od formularza */}
        <div className="ai-node" style={{
          position: 'absolute',
          width: '8px',
          height: '8px',
          background: 'radial-gradient(circle, #a3cd39, #8bc34a)',
          borderRadius: '50%',
          top: '10%',
          left: '5%',
          zIndex: 1,
          boxShadow: '0 0 12px #a3cd39',
          opacity: 0.4
        }} />
        <div className="ai-node" style={{
          position: 'absolute',
          width: '6px',
          height: '6px',
          background: 'radial-gradient(circle, #8bc34a, #a3cd39)',
          borderRadius: '50%',
          top: '40%',
          left: '8%',
          zIndex: 1,
          boxShadow: '0 0 10px #8bc34a',
          opacity: 0.3
        }} />
        <div className="ai-node" style={{
          position: 'absolute',
          width: '7px',
          height: '7px',
          background: 'radial-gradient(circle, #a3cd39, #8bc34a)',
          borderRadius: '50%',
          top: '80%',
          left: '3%',
          zIndex: 1,
          boxShadow: '0 0 11px #a3cd39',
          opacity: 0.4
        }} />
        
        {/* Data streams on right side */}
        <div className="data-stream" style={{
          position: 'absolute',
          width: '2px',
          height: '40px',
          background: 'linear-gradient(to bottom, transparent, #a3cd39, transparent)',
          right: '15%',
          top: 0,
          zIndex: 1
        }} />
        <div className="data-stream" style={{
          position: 'absolute',
          width: '1px',
          height: '30px',
          background: 'linear-gradient(to bottom, transparent, #8bc34a, transparent)',
          right: '25%',
          top: 0,
          zIndex: 1
        }} />
        <div className="data-stream" style={{
          position: 'absolute',
          width: '2px',
          height: '35px',
          background: 'linear-gradient(to bottom, transparent, #a3cd39, transparent)',
          right: '35%',
          top: 0,
          zIndex: 1
        }} />
        <div className="data-stream" style={{
          position: 'absolute',
          width: '1px',
          height: '25px',
          background: 'linear-gradient(to bottom, transparent, #8bc34a, transparent)',
          right: '45%',
          top: 0,
          zIndex: 1
        }} />
        <div className="data-stream" style={{
          position: 'absolute',
          width: '2px',
          height: '30px',
          background: 'linear-gradient(to bottom, transparent, #a3cd39, transparent)',
          right: '55%',
          top: 0,
          zIndex: 1
        }} />
        
        {/* Geometric AI shapes - bardziej subtelne i dalej od formularza */}
        <div className="geometric-shape" style={{
          position: 'absolute',
          width: '15px',
          height: '15px',
          background: 'linear-gradient(45deg, rgba(163, 205, 57, 0.2), rgba(139, 195, 74, 0.1))',
          top: '20%',
          right: '15%',
          zIndex: 1,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          opacity: 0.5
        }} />
        <div className="geometric-shape hexagon-ai" style={{
          position: 'absolute',
          width: '12px',
          height: '12px',
          background: 'linear-gradient(60deg, rgba(84, 57, 205, 0.3), rgba(139, 195, 74, 0.1))',
          top: '60%',
          right: '25%',
          zIndex: 1,
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
          opacity: 0.4
        }} />
        <div className="geometric-shape" style={{
          position: 'absolute',
          width: '10px',
          height: '10px',
          background: 'linear-gradient(45deg, rgba(163, 205, 57, 0.1), rgba(139, 195, 74, 0.05))',
          top: '85%',
          right: '20%',
          zIndex: 1,
          border: '1px solid rgba(163, 205, 57, 0.2)',
          opacity: 0.3
        }} />

        <div style={{
          display: 'flex',
          width: '100%',
          position: 'relative',
          zIndex: 2
        }}>
          {/* Lewa kolumna z formularzem - bez obwódek, jednorodne tło */}
          <div className="form-container" style={{ 
            flex: '1',
            minWidth: '400x',
            height: '94vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '3rem',
            background: 'rgba(26, 26, 26, 0.9)',
            backdropFilter: 'blur(20px)',
            position: 'relative'
          }}>
            {/* Animated top border */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #a3cd39, transparent)',
              animation: 'shimmer 3s ease-in-out infinite'
            }} />
            
            <div style={{ 
              maxWidth: '400px',
              margin: '0 auto',
              width: '100%'
            }}>
              {/* Logo section */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '2.5rem',
                animation: 'fadeInUp 0.8s ease-out'
              }}>              
              </div>

              <h1 className="form-group" style={{ 
                fontSize: '36px',
                fontWeight: '800',
                marginBottom: '8px',
                color: 'white',
                letterSpacing: '-0.5px'
              }}>
                Zaloguj się
              </h1>
              <p className="form-group" style={{ 
                fontSize: '18px',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '2.5rem',
                fontWeight: '500'
              }}>
                Asystent dla projektów UE
              </p>

              {error && (
                <div style={{ 
                  padding: '16px',
                  background: 'rgba(220, 53, 69, 0.2)',
                  borderRadius: '12px',
                  color: '#ff6b7a',
                  marginBottom: '1.5rem',
                  border: '1px solid rgba(220, 53, 69, 0.3)',
                  animation: 'fadeInUp 0.5s ease-out',
                  fontWeight: '500'
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label 
                    htmlFor="email" 
                    style={{ 
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '8px',
                      color: 'rgba(255, 255, 255, 0.9)'
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
                    className="input-focus"
                    style={{ 
                      width: '100%',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      outline: 'none',
                      fontWeight: '500'
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label 
                    htmlFor="password" 
                    style={{ 
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '8px',
                      color: 'rgba(255, 255, 255, 0.9)'
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
                    className="input-focus"
                    style={{ 
                      width: '100%',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      outline: 'none',
                      fontWeight: '500'
                    }}
                  />
                </div>

                <div className="form-group" style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '2rem'
                }}>
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ 
                      marginRight: '10px',
                      transform: 'scale(1.2)',
                      accentColor: '#a3cd39'
                    }}
                  />
                  <label htmlFor="remember" style={{ 
                    fontSize: '14px', 
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}>
                    Zapamiętaj mnie
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="button-hover"
                  style={{ 
                    width: '100%',
                    padding: '16px',
                    background: loading 
                      ? 'rgba(108, 117, 125, 0.5)' 
                      : 'linear-gradient(135deg, #a3cd39 0%, #8bc34a 100%)',
                    color: loading ? 'rgba(255, 255, 255, 0.5)' : '#1a1a1a',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: loading ? 'none' : '0 0 25px rgba(163, 205, 57, 0.4)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginRight: '8px'
                      }} />
                      Logowanie...
                    </>
                  ) : (
                    'Zaloguj się'
                  )}
                </button>
              </form>

              {debugInfo && (
                <div style={{ 
                  marginTop: '2rem',
                  padding: '16px',
                  background: 'rgba(13, 110, 253, 0.2)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: '#66b3ff',
                  border: '1px solid rgba(13, 110, 253, 0.3)',
                  animation: 'fadeInUp 0.5s ease-out'
                }}>
                  <p style={{ marginBottom: '8px', fontWeight: '600' }}>
                    Informacje diagnostyczne:
                  </p>
                  <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-all',
                    fontSize: '12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(13, 110, 253, 0.2)',
                    maxHeight: '150px',
                    overflow: 'auto',
                    color: '#99ccff'
                  }}>
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Prawa kolumna z informacjami */}
          <div className="info-container" style={{ 
            flex: '1',
            minWidth: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '3rem',
            position: 'relative'
          }}>
            <div style={{ 
              maxWidth: '500px',
              textAlign: 'center',
              position: 'relative'
            }}>
              {/* Logo z AI glow effect */}
              <div style={{ 
                width: '200px',
                height: '200px',
                position: 'relative',
                margin: '0 auto 2rem auto',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(163, 205, 57, 0.2) 0%, transparent 70%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'aiPulse 6s ease-in-out infinite',
                border: '2px solid rgba(163, 205, 57, 0.3)'
              }}>
                <Image
                  src="/MarsoftAI.png"
                  alt="MarsoftAI Logo"
                  width={160}
                  height={160}
                  style={{ 
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 0 20px rgba(163, 205, 57, 0.6))'
                  }}
                  priority
                />
              </div>
              
              <h2 style={{ 
                fontSize: '42px',
                fontWeight: '800',
                color: 'white',
                marginBottom: '1rem',
                letterSpacing: '-1px',
                animation: 'fadeInUp 1s ease-out 0.3s both',
                textShadow: '0 0 20px rgba(163, 205, 57, 0.3)'
              }}>
                AI ASYSTENT
              </h2>
              
              <p style={{ 
                fontSize: '20px',
                color: 'rgba(255, 255, 255, 0.8)',
                maxWidth: '400px',
                marginBottom: '2.5rem',
                lineHeight: '1.6',
                fontWeight: '500',
                animation: 'fadeInUp 1s ease-out 0.4s both'
              }}>
                Twój inteligentny asystent do tworzenia i zarządzania dokumentacją projektów UE.
              </p>
              
              {/* Funkcje asystenta z tech vibes */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                textAlign: 'left',
                padding: '2rem',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                boxShadow: '0 0 40px rgba(163, 205, 57, 0.1)',
                border: '1px solid rgba(163, 205, 57, 0.2)',
                animation: 'fadeInUp 1s ease-out 0.5s both'
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  color: 'white', 
                  fontWeight: '700',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  Funkcjonalności:
                </h3>
                
                {[
                  'Tworzyć profesjonalną dokumentację projektową',
                  'Analizować i generować harmonogramy', 
                  'Przygotować budżety i zestawienia finansowe',
                  'Odpowiadać na pytania o fundusze europejskie'
                ].map((feature, index) => (
                  <div 
                    key={index}
                    className="feature-item"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      padding: '4px',
                      animation: `fadeInUp 1s ease-out ${0.6 + index * 0.1}s both`
                    }}
                  >
                    <div style={{ 
                      width: '28px', 
                      height: '28px', 
                      background: 'linear-gradient(135deg, #a3cd39, #8bc34a)', 
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 0 15px rgba(163, 205, 57, 0.5)'
                    }}>
                      <span style={{ color: '#1a1a1a', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                    </div>
                    <span style={{ 
                      fontSize: '15px', 
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Stopka */}
        <div style={{ 
          position: 'absolute',
          bottom: 0,
          width: '100%',
          textAlign: 'center', 
          padding: '1rem',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '14px',
          borderTop: '1px solid rgba(163, 205, 57, 0.2)',
          fontWeight: '500'
        }}>
          &copy; {new Date().getFullYear()} MarsoftAI - Wszelkie prawa zastrzeżone
        </div>
      </div>
    </>
  );
}