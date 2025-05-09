'use client';

// src/components/Chat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import { getOpenAIResponseWithWebSearch } from '@/lib/openai-service';


const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
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
    scrollToBottom();
  }, [messages]);

  // Automatyczne dostosowanie wysokości inputa
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Funkcja dostępna globalnie do dodawania wiadomości z innych komponentów
  useEffect(() => {
    // Dodanie globalnej funkcji dla FileUpload
    (window as any).sendMessageToChat = (text: string) => {
      const userMessage: Message = {
        id: uuidv4(),
        text,
        sender: 'user',
        timestamp: new Date()
      };
      
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      
      // Automatycznie generujemy odpowiedź na przesłany dokument
      setTimeout(async () => {
        await typeMessage(`## Analiza dokumentu

- Dziękuję za przesłanie dokumentu
- Przeanalizowałem jego zawartość
- Teraz mogę pomóc w związku z tym dokumentem

### Możliwe działania:

1. Odpowiedzieć na pytania dotyczące treści
2. Wyjaśnić poszczególne elementy
3. Zaproponować usprawnienia lub modyfikacje

W czym dokładnie mogę pomóc w związku z tym dokumentem?`);
      }, 1000);
    };
    
    return () => {
      // Czyszczenie przy odmontowaniu
      delete (window as any).sendMessageToChat;
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  // Symulacja efektu pisania przez bota
  const typeMessage = async (text: string): Promise<void> => {
    return new Promise((resolve) => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        
        // Dodaj odpowiedź bota
        const botMessage: Message = {
          id: uuidv4(),
          text, // Zachowaj oryginalny format Markdown
          sender: 'bot',
          timestamp: new Date()
        };
        
        setMessages((prevMessages) => [...prevMessages, botMessage]);
        resolve();
      }, 1000 + Math.random() * 1000); // Symulacja czasu odpowiedzi
    });
  };

  // Funkcja do rzeczywistego przetwarzania wiadomości przez API
  const processMessage = async (message: string): Promise<string> => {
    try {
      // Prawdziwe wywołanie API OpenAI
      const response = await getOpenAIResponseWithWebSearch(message, [], true);
      console.log('Odpowiedź z API OpenAI:', response); // Dodajemy log
      return response;
    } catch (error) {
      console.error('Błąd podczas przetwarzania wiadomości:', error);
      return "## Przepraszam\n\nWystąpił błąd podczas przetwarzania Twojego zapytania. Proszę spróbować ponownie.";
    }
  };

  // Funkcja do mapowania pomiędzy interfejsem Message a modelem Prisma
  const saveMessageToDb = async (message: Message) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message.text,        // Mapowanie text → content
          role: message.sender === 'bot' ? 'assistant' : 'user',  // Mapowanie sender → role
          chatId: 'aktualny-id-czatu'   // Tutaj trzeba podać właściwe ID czatu
        }),
      });
      
      if (!response.ok) {
        console.error('Błąd podczas zapisywania wiadomości:', await response.text());
      }
    } catch (error) {
      console.error('Wyjątek podczas zapisywania wiadomości:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim() === '') return;
    
    // Dodaj wiadomość użytkownika
    const userMessage: Message = {
      id: uuidv4(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Przetwórz wiadomość użytkownika
      const response = await processMessage(inputValue);
      
      // Pokaż efekt pisania
      await typeMessage(response);
    } catch (error) {
      console.error('Błąd podczas przetwarzania wiadomości:', error);
      await typeMessage("## Przepraszam\n\nWystąpił błąd podczas przetwarzania Twojego zapytania. Proszę spróbować ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  // Obsługa wysyłania wiadomości po naciśnięciu Enter (bez Shift)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Dodaj style CSS dla formatowania Markdown */}
      <style jsx global>{`
        /* Style dla zawartości Markdown */
        .markdown-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          overflow-wrap: break-word;
        }
        
        .markdown-content ul {
          list-style-type: disc;
          margin-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .markdown-content ol {
          list-style-type: decimal;
          margin-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .markdown-content li {
          margin-bottom: 0.25rem;
          line-height: 1.5;
          display: list-item;
        }
        
        .markdown-content h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .markdown-content h3 {
          font-size: 1.125rem;
          font-weight: 500;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
        }
        
        .markdown-content p {
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }
        
        .markdown-content strong {
          font-weight: 700;
        }
        
        /* Dodatkowe style dla list zagnieżdżonych */
        .markdown-content ul ul,
        .markdown-content ol ol,
        .markdown-content ol ul,
        .markdown-content ul ol {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }
        
        /* Dodatkowe style dla separatorów poziomych */
        .markdown-content hr {
          border: 0;
          border-top: 1px solid #e5e7eb;
          margin: 1rem 0;
        }
      `}</style>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'bot' ? 'justify-start' : 'justify-end'} mb-4`}>
            {message.sender === 'bot' && (
              <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-100 flex-shrink-0 mr-2">
                <div className="relative w-full h-full">
                  <Image 
                    src="/MarsoftAI.png" 
                    alt="MarsoftAI" 
                    width={32}
                    height={32}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            )}
            
            <div className={`max-w-[75%] ${message.sender !== 'bot' && 'order-1'}`}>
              <div className={`rounded-t-lg ${
                message.sender === 'bot' ? 'rounded-br-lg bg-white border border-gray-200' : 'rounded-bl-lg bg-blue-600 text-white'
              } px-4 py-3 shadow-sm`}>
                {message.sender === 'bot' ? (
                  <div className="markdown-content">
                    <ReactMarkdown>
                      {message.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-white whitespace-pre-line">
                    {message.text}
                  </div>
                )}
              </div>
              
              <div className={`text-xs text-gray-500 mt-1 ${message.sender === 'bot' ? 'text-left' : 'text-right'}`}>
                {new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' }).format(message.timestamp)}
              </div>
            </div>
            
            {message.sender !== 'bot' && (
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 ml-2">
                <span className="text-sm font-medium">U</span>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center space-x-2 text-gray-500 px-4 py-2 rounded-lg bg-gray-100 max-w-[80%]">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          <div className="relative flex-1 border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 bg-white">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Napisz wiadomość..."
              className="w-full px-4 py-3 resize-none focus:outline-none"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center justify-center"
            disabled={isLoading || inputValue.trim() === ''}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </div>
      
      {/* Dodatkowy CSS dla animacji pisania */}
      <style jsx>{`
        .typing-indicator {
          display: flex;
          align-items: center;
        }
        
        .typing-indicator span {
          height: 8px;
          width: 8px;
          background-color: #606060;
          border-radius: 50%;
          display: block;
          margin: 0 2px;
          opacity: 0.4;
          animation: typing 1s infinite alternate;
        }
        
        .typing-indicator span:nth-child(1) {
          animation-delay: 0s;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.3s;
        }
        
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.6s;
        }
        
        @keyframes typing {
          0% {
            opacity: 0.4;
            transform: translateY(0);
          }
          100% {
            opacity: 1;
            transform: translateY(-3px);
          }
        }
      `}</style>
    </div>
  );
};

export default Chat;