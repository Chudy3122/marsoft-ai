// src/components/ChatMessage.tsx

import React from 'react';
import { Message } from '../types';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import MessagePdfExport from './MessagePdfExport';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { id, text, sender, timestamp } = message;
  
  // Formatowanie daty
  const formattedTime = new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp);
  
  // Sprawdź, czy wiadomość zawiera potencjalny dokument do eksportu
  // (długa wiadomość, posiadająca nagłówki, tabele lub listy)
  const isPotentialDocument = React.useMemo(() => {
    if (sender !== 'bot') return false;
    
    // Sprawdź długość wiadomości (minimalnie 300 znaków)
    if (text.length < 300) return false;
    
    // Sprawdź, czy zawiera nagłówki Markdown
    const hasHeadings = /^#{1,3}\s+.+/m.test(text);
    
    // Sprawdź, czy zawiera listy (punktowane lub numerowane)
    const hasLists = /^(\s*[-*+]\s+.+|\s*\d+\.\s+.+)/m.test(text);
    
    // Sprawdź, czy zawiera tabele Markdown
    const hasTables = /\|.+\|.+\|/.test(text);
    
    // Sprawdź czy zawiera pogrubienia lub podkreślenia
    const hasFormatting = /\*\*.+\*\*|__.+__/.test(text);
    
    return hasHeadings || hasLists || hasTables || hasFormatting;
  }, [text, sender]);
  
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
        <div 
          className={`rounded-t-lg ${
            isBot ? 'rounded-br-lg bg-white border border-gray-200' : 'rounded-bl-lg bg-blue-600 text-white'
          } px-4 py-3 shadow-sm`}
        >
          {isBot ? (
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {text}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-white whitespace-pre-line">
              {text}
            </div>
          )}
        </div>
        
        <div className={`text-xs mt-1 flex items-center ${isBot ? 'text-left' : 'text-right'}`}>
          <span className="text-gray-500">{formattedTime}</span>
          
          {/* Przycisk eksportu do PDF dla wiadomości asystenta, które mogą być dokumentami */}
          {isBot && isPotentialDocument && (
            <div className="ml-2">
              <MessagePdfExport 
                messageContent={text} 
                fileName={`dokument-${id}.pdf`}
                small={true}
              />
            </div>
          )}
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