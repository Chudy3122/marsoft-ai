'use client';

// src/context/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Message } from '../types';

interface FileData {
  fileName: string;
  fileType: string;
  content: string;
  metadata?: any;
}

interface AppContextType {
  messages: Message[];
  addMessage: (text: string, sender: 'user' | 'bot') => void;
  fileData: FileData | null;
  setFileData: (data: FileData | null) => void;
  analyzeFileInChat: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileData, setFileData] = useState<FileData | null>(null);

  // Funkcja do dodawania nowej wiadomości
  const addMessage = (text: string, sender: 'user' | 'bot') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date()
    };
    
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  // Funkcja do analizy pliku w czacie
  const analyzeFileInChat = () => {
    if (!fileData) return;
    
    // Dodajemy wiadomość użytkownika o załadowanym pliku
    addMessage(`Proszę o analizę dokumentu: ${fileData.fileName}`, 'user');
    
    // Symulujemy odpowiedź bota (w rzeczywistości tutaj byłoby wywołanie do API)
    setTimeout(() => {
      addMessage(
        `Załadowano dokument ${fileData.fileName}. Typ pliku: ${fileData.fileType}. ${
          fileData.metadata?.numPages 
            ? `Liczba stron: ${fileData.metadata.numPages}.` 
            : ''
        } Jak mogę pomóc w analizie tego dokumentu?`,
        'bot'
      );
    }, 1000);
  };

  return (
    <AppContext.Provider
      value={{
        messages,
        addMessage,
        fileData,
        setFileData,
        analyzeFileInChat
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// Hook do łatwego dostępu do kontekstu
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};