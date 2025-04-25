// components/ChatSidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatSidebarProps {
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export default function ChatSidebar({ currentChatId, onSelectChat, onNewChat }: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Pobieranie historii czatów
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch('/api/chats');
        if (!response.ok) throw new Error('Problem z pobraniem czatów');
        
        const data = await response.json();
        setChats(data.chats);
      } catch (error) {
        console.error('Błąd podczas pobierania historii czatów:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChats();
  }, []);

  // Formatowanie daty
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Dzisiaj';
    }
    
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Wczoraj';
    }
    
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="w-64 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Przycisk nowego czatu */}
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Nowa konwersacja
        </button>
      </div>
      
      {/* Lista czatów */}
      <div className="flex-1 overflow-y-auto p-2">
        <h3 className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
          Historia Czatów
        </h3>
        
        {loading ? (
          <div className="text-center py-4 text-gray-500">Ładowanie...</div>
        ) : chats.length === 0 ? (
          <div className="text-center py-4 text-gray-500">Brak historii czatów</div>
        ) : (
          <ul className="mt-2 space-y-1">
            {chats.map((chat) => (
              <li key={chat.id}>
                <button
                  onClick={() => onSelectChat(chat.id)}
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center ${
                    currentChatId === chat.id 
                      ? 'bg-green-50 text-green-700' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex-shrink-0 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{chat.title}</p>
                    <p className="text-xs text-gray-500">{formatDate(chat.updatedAt)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}