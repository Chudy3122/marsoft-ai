'use client';

// src/app/page.tsx
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
// Importujemy usługę OpenAI
import { getOpenAIResponse, analyzePdfWithOpenAI } from '../lib/openai-service';
import PdfUploadButton from '../components/PdfUploadButton';
import getServerSession from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Navigation from '@/components/Navigation';

// Definicja typów
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pdfInfo, setPdfInfo] = useState<any | null>(null);

  if (!session) {
    redirect('/login');
  }
  
  // Początkowa wiadomość bota
  useEffect(() => {
    const initialMessage: Message = {
      id: uuidv4(),
      text: "Witaj w MarsoftAI! Jestem asystentem dla projektów UE. Jak mogę Ci pomóc w tworzeniu dokumentacji projektowej?",
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages([initialMessage]);
  }, []);

  // Przewijanie do najnowszej wiadomości
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim() === '' || isLoading) return;
    
    const userInput = inputValue.trim();
    console.log("🔍 Wysyłanie zapytania:", userInput);
    
    // Dodaj wiadomość użytkownika
    const userMessage: Message = {
      id: uuidv4(),
      text: userInput,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    let response = "";
    
    try {
      console.log("🔍 Próba pobrania odpowiedzi z API OpenAI...");
      
      // Użycie funkcji pomocniczej do obsługi odpowiedzi
      response = await getAIResponseWithFallback(userInput);
      console.log("🔍 Otrzymano odpowiedź:", response);
    } catch (error) {
      console.error('🔍 Błąd podczas przetwarzania wiadomości:', error);
      response = "Przepraszam, wystąpił błąd podczas przetwarzania Twojego zapytania. Spróbuj ponownie później.";
    } finally {
      // Dodaj odpowiedź bota
      const botMessage: Message = {
        id: uuidv4(),
        text: response,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages((prevMessages) => [...prevMessages, botMessage]);
      setIsLoading(false);
    }
  };

  const [pdfText, setPdfText] = useState<string | null>(null);
  const [pdfMetadata, setPdfMetadata] = useState<any | null>(null);

  // Funkcja pomocnicza do obsługi odpowiedzi z OpenAI
  const getAIResponseWithFallback = async (prompt: string): Promise<string> => {
    try {
      // Jeśli mamy wgrany PDF (tekst i metadane), używamy funkcji analizy dokumentu
      if (pdfText && pdfMetadata) {
        return await analyzePdfWithOpenAI(pdfText, pdfMetadata, prompt);
      }
      
      // W przeciwnym razie używamy standardowego API
      return await getOpenAIResponse(prompt);
    } catch (error) {
      console.error("Błąd w getOpenAIResponse:", error);
      return "Przepraszam, wystąpił problem z połączeniem. Spróbuj ponownie za chwilę.";
    }
  };

  // Formatowanie daty dla wiadomości
  const formatMessageTime = (date: Date) => {
    return new Intl.DateTimeFormat('pl-PL', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Obsługa zawartości PDF
  const handlePdfContent = (content: string, metadata: any) => {
    setPdfText(content);
    setPdfMetadata(metadata);
    
    // Dodajemy informację o wgranym PDF-ie do czatu
    const pdfMessage: Message = {
      id: uuidv4(),
      text: `Wgrano dokument PDF: "${metadata.title}" (${metadata.pages} stron). Możesz teraz zadawać pytania dotyczące jego zawartości.`,
      sender: 'bot',
      timestamp: new Date()
    };
    
    setMessages((prevMessages) => [...prevMessages, pdfMessage]);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <Navigation />
      {/* Nagłówek */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: 'white'
      }}>
        <div style={{ position: 'relative', width: '80px', height: '80px', marginRight: '12px' }}>
          <Image 
            src="/MarsoftAI.png" 
            alt="MarsoftAI Logo" 
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#333d3d' }}>MarsoftAI</h1>
        
        {/* Dodanie przycisku do wgrywania PDF */}
        <div style={{ marginLeft: 'auto' }}>
          <PdfUploadButton onPdfContent={handlePdfContent} />
        </div>
      </header>
      
      {/* Obszar wiadomości */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px',
        backgroundColor: '#f9f9f9'
      }}>
        {messages.map((message) => (
          <div 
            key={message.id} 
            style={{
              display: 'flex',
              justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '16px'
            }}
          >
            {message.sender === 'bot' && (
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                overflow: 'hidden',
                marginRight: '8px',
                position: 'relative'
              }}>
                <Image 
                  src="/MarsoftAI.png" 
                  alt="MarsoftAI" 
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
            )}
            
            <div style={{
              maxWidth: '80%',
              padding: '12px',
              borderRadius: '16px',
              backgroundColor: message.sender === 'user' ? '#a3cd39' : 'white',
              color: message.sender === 'user' ? 'white' : '#333333',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
              border: message.sender === 'bot' ? '1px solid #e5e7eb' : 'none'
            }}>
              <div>{message.text}</div>
              <div style={{
                fontSize: '12px',
                color: message.sender === 'user' ? 'rgba(255, 255, 255, 0.8)' : '#9ca3af',
                textAlign: 'right',
                marginTop: '4px'
              }}>
                {formatMessageTime(message.timestamp)}
              </div>
            </div>
            
            {message.sender === 'user' && (
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#a3cd39',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '8px'
              }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>U</span>
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              overflow: 'hidden',
              marginRight: '8px',
              position: 'relative'
            }}>
              <Image 
                src="/MarsoftAI.png" 
                alt="MarsoftAI" 
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div style={{
              padding: '12px',
              borderRadius: '16px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#9ca3af',
                  animation: 'bounce 1s infinite alternate'
                }}></div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#9ca3af',
                  animation: 'bounce 1s infinite alternate',
                  animationDelay: '0.2s'
                }}></div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#9ca3af',
                  animation: 'bounce 1s infinite alternate',
                  animationDelay: '0.4s'
                }}></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Wskaźnik, gdy PDF jest załadowany */}
        {pdfInfo && (
          <div 
            style={{
              margin: '8px 0',
              padding: '8px 12px',
              backgroundColor: 'rgba(163, 205, 57, 0.1)',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#4b5563',
              borderLeft: '3px solid #a3cd39',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              style={{ width: '16px', height: '16px', marginRight: '8px', color: '#a3cd39' }}
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            <span>
              Aktywny dokument: "{pdfInfo.title}"
              {pdfInfo.size && ` (${(pdfInfo.size / 1024).toFixed(2)} KB)`}
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input wiadomości */}
      <div style={{
        borderTop: '1px solid #e5e7eb',
        backgroundColor: 'white',
        padding: '16px'
      }}>
        <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
          <input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Napisz wiadomość..."
            style={{
              width: '100%',
              padding: '12px 48px 12px 16px',
              borderRadius: '12px',
              border: '1px solid #d1d5db',
              outline: 'none'
            }}
            disabled={isLoading}
          />
          <button
            type="submit"
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: '#a3cd39',
              color: 'white',
              borderRadius: '8px',
              padding: '8px',
              border: 'none',
              cursor: 'pointer',
              opacity: isLoading || inputValue.trim() === '' ? 0.5 : 1
            }}
            disabled={isLoading || inputValue.trim() === ''}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
        <div style={{
          fontSize: '12px',
          color: '#9ca3af',
          textAlign: 'center',
          marginTop: '8px'
        }}>
          AI-generated, for reference only
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  );
}