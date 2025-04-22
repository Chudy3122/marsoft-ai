'use client';

// src/components/Chat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';
import ChatMessage from './ChatMessage';
import ReactMarkdown from 'react-markdown';

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
        await typeMessage("Dziękuję za przesłanie dokumentu. Przeanalizowałem jego zawartość. W czym dokładnie mogę pomóc w związku z tym dokumentem? Czy masz konkretne pytania dotyczące jego treści lub chciałbyś, żebym wyjaśnił jakieś elementy?");
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
          text: text,
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
      // Tutaj możemy zaimplementować rzeczywiste wywołanie API
      // Przykładowa integracja z OpenAI API
      
      // Dla celów demo, używamy prostego lokalnego przetwarzania
      if (message.toLowerCase().includes('pdf') || message.toLowerCase().includes('dokument')) {
        return "Widzę, że chcesz analizować dokument PDF. Możesz wgrać plik w zakładce 'Wgraj dokument', a następnie kliknąć 'Analizuj w czacie', aby przesłać jego zawartość tutaj.";
      } else if (message.toLowerCase().includes('wniosek')) {
        return "Mogę pomóc Ci w przygotowaniu wniosku o dofinansowanie. Dostępne są różne rodzaje wniosków w zależności od programu operacyjnego. Czy interesuje Cię konkretny program, np. EFS, EFRR, czy może jakiś regionalny program operacyjny?";
      } else if (message.toLowerCase().includes('raport')) {
        return "W kwestii raportów projektowych, mogę pomóc z raportami okresowymi, końcowymi oraz sprawozdaniami z realizacji wskaźników. Który rodzaj raportu Cię interesuje?";
      } else if (message.toLowerCase().includes('harmonogram')) {
        return "Harmonogram projektu jest kluczowym elementem dokumentacji. Mogę pomóc Ci stworzyć harmonogram zgodny z metodologią zarządzania projektami UE, uwzględniający kamienie milowe, zadania i ich zależności. Od czego chciałbyś zacząć?";
      } else if (message.toLowerCase().includes('budżet')) {
        return "Przygotowanie budżetu projektu UE wymaga szczegółowego rozpisania wszystkich kategorii kosztów. Mogę pomóc Ci stworzyć budżet z podziałem na koszty bezpośrednie, pośrednie, cross-financing i wkład własny. Jakie działania planujesz w projekcie?";
      } else if (message.toLowerCase().includes('termin')) {
        return "Terminy składania wniosków zależą od konkretnego naboru i programu operacyjnego. Aktualnie trwają nabory w ramach programów: Fundusze Europejskie dla Rozwoju Społecznego 2021-2027, Fundusze Europejskie na Infrastrukturę, Klimat, Środowisko 2021-2027. Który program Cię interesuje?";
      } else if (message.toLowerCase().includes('analizę dokumentu')) {
        return "Widzę, że przesłałeś dokument do analizy. Przejrzałem jego zawartość i mogę pomóc w interpretacji zawartych w nim informacji. O które konkretnie elementy dokumentu chciałbyś dopytać?";
      } else {
        return "Jako MarsoftAI specjalizuję się w pomocy przy tworzeniu dokumentacji projektów UE. Mogę pomóc Ci z wnioskami o dofinansowanie, raportami, harmonogramami, budżetami i innymi dokumentami projektu. Powiedz mi, nad jakim dokumentem chciałbyś pracować?";
      }
    } catch (error) {
      console.error('Błąd podczas przetwarzania wiadomości:', error);
      return "Przepraszam, wystąpił błąd podczas przetwarzania Twojego zapytania. Proszę spróbować ponownie.";
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
      await typeMessage(response);
    } catch (error) {
      console.error('Błąd podczas przetwarzania wiadomości:', error);
      await typeMessage("Przepraszam, wystąpił błąd podczas przetwarzania twojego zapytania. Proszę spróbować ponownie.");
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
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
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