'use client';

// src/components/ChatMessage.tsx
import React from 'react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { text, sender, timestamp } = message;
  
  // Formatowanie daty
  const formattedTime = new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp);
  
  // Różne style dla wiadomości użytkownika i bota
  const isBot = sender === 'bot';
  
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}>
      {isBot && (
        <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-100 flex-shrink-0 mr-2">
          <div className="relative w-full h-full">
            <Image 
              src="/MarsoftAI.png" 
              alt="MarsoftAI" 
              fill
              style={{ objectFit: 'cover' }}
            />
          </div>
        </div>
      )}
      
      <div className={`max-w-[75%] ${!isBot && 'order-1'}`}>
        <div className={`rounded-t-lg ${
          isBot ? 'rounded-br-lg bg-white border border-gray-200' : 'rounded-bl-lg bg-blue-600 text-white'
        } px-4 py-3 shadow-sm`}>
          <div className="prose max-w-none">
            <ReactMarkdown>
              {text}
            </ReactMarkdown>
          </div>
        </div>
        
        <div className={`text-xs text-gray-500 mt-1 ${isBot ? 'text-left' : 'text-right'}`}>
          {formattedTime}
        </div>
      </div>
      
      {!isBot && (
        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 ml-2">
          <span className="text-sm font-medium">U</span>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;