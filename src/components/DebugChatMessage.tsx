'use client';

// src/components/DebugChatMessage.tsx
import React, { useEffect } from 'react';
import { Message } from '../types';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';

interface DebugChatMessageProps {
  message: Message;
}

// Funkcja debugowania, która pokaże dokładnie, co dzieje się z tekstem
const processMarkdownWithDebug = (text: string): string => {
  if (!text) {
    console.log('DEBUG: Pusty tekst wiadomości!');
    return '';
  }
  
  console.log('DEBUG: Oryginalny tekst:', text);
  console.log('DEBUG: Długość tekstu:', text.length);
  console.log('DEBUG: Zawiera ## ?', text.includes('##'));
  console.log('DEBUG: Zawiera ** ?', text.includes('**'));
  console.log('DEBUG: Zawiera - ?', text.includes('-'));
  console.log('DEBUG: Zawiera • ?', text.includes('•'));
  console.log('DEBUG: Zawiera znaki nowej linii?', text.includes('\n'));
  console.log('DEBUG: Liczba znaków nowej linii:', (text.match(/\n/g) || []).length);
  
  let result = text;
  
  // Krok 1: Przekształć nagłówki ZMI
  if (result.includes('## ZMI')) {
    console.log('DEBUG: Znaleziono format ZMI');
    let afterStep1 = result.replace(/(## ZMI[^\n]*)/g, '$1\n\n');
    console.log('DEBUG: Po kroku 1 (nagłówki ZMI):', afterStep1);
    result = afterStep1;
  }
  
  // Krok 2: Przekształć **Zadanie x:** na nagłówki
  if (result.includes('**Zadanie')) {
    console.log('DEBUG: Znaleziono zadania');
    let afterStep2 = result.replace(/\*\*Zadanie (\d+):\*\*/g, '## Zadanie $1:');
    console.log('DEBUG: Po kroku 2 (zadania):', afterStep2);
    result = afterStep2;
  }
  
  // Krok 3: Przekształć **Milestone x:** na nagłówki poziom 3
  if (result.includes('**Milestone')) {
    console.log('DEBUG: Znaleziono kamienie milowe');
    let afterStep3 = result.replace(/\*\*Milestone (\d+):\*\*/g, '### Milestone $1:');
    console.log('DEBUG: Po kroku 3 (kamienie milowe):', afterStep3);
    result = afterStep3;
  }
  
  // Krok 4: Przekształć **Wskaźnik x:** na pogrubiony punkt listy
  if (result.includes('**Wskaźnik')) {
    console.log('DEBUG: Znaleziono wskaźniki');
    let afterStep4 = result.replace(/\*\*Wskaźnik (\d+):\*\*/g, '- **Wskaźnik $1:**');
    console.log('DEBUG: Po kroku 4 (wskaźniki):', afterStep4);
    result = afterStep4;
  }
  
  // Krok 5: Zamień ciągłe myślniki na punkty listy z odstępami między nimi
  let afterStep5 = result.replace(/- ([^\n]+)(?=\s+-)/g, '- $1\n');
  console.log('DEBUG: Po kroku 5 (listy punktowane):', afterStep5);
  result = afterStep5;
  
  // Krok 6: Upewnij się, że przed każdą listą jest nowa linia
  let afterStep6 = result.replace(/([^\n])(\n- )/g, '$1\n\n$2');
  console.log('DEBUG: Po kroku 6 (nowe linie przed listami):', afterStep6);
  result = afterStep6;
  
  // Krok 7: Podwójne nowe linie przed każdym nagłówkiem
  let afterStep7 = result.replace(/([^\n])(#{1,6} )/g, '$1\n\n$2');
  console.log('DEBUG: Po kroku 7 (nowe linie przed nagłówkami):', afterStep7);
  result = afterStep7;
  
  // Krok 8: Podwójne nowe linie po każdym nagłówku
  let afterStep8 = result.replace(/(#{1,6} [^\n]+)(\n[^#\n])/g, '$1\n\n$2');
  console.log('DEBUG: Po kroku 8 (nowe linie po nagłówkach):', afterStep8);
  result = afterStep8;
  
  // Krok 9: Wypisz znaki ASCII (kodowanie) dla tekstu wynikowego
  console.log('DEBUG: Kody ASCII przetwarzanego tekstu:');
  for (let i = 0; i < Math.min(result.length, 100); i++) {
    console.log(`Znak ${i}: '${result[i]}' - kod: ${result.charCodeAt(i)}`);
  }
  
  return result;
};

const DebugChatMessage: React.FC<DebugChatMessageProps> = ({ message }) => {
  const { text, sender, timestamp } = message;
  
  // Debugowanie przy montowaniu komponentu
  useEffect(() => {
    if (sender === 'bot') {
      console.log('========== DEBUGOWANIE WIADOMOŚCI BOTA ==========');
      const processedText = processMarkdownWithDebug(text);
      console.log('========== KONIEC DEBUGOWANIA ==========');
    }
  }, [text, sender]);
  
  // Przetwarzamy tekst do Markdown, ale tylko dla wiadomości bota
  const displayText = sender === 'bot' ? processMarkdownWithDebug(text) : text;
  
  // Formatowanie daty
  const formattedTime = new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp);
  
  // Różne style dla wiadomości użytkownika i bota
  const isBot = sender === 'bot';
  
  // Symulacja wewnętrznego procesu ReactMarkdown dla debugowania
  useEffect(() => {
    if (sender === 'bot') {
      console.log('DEBUG ReactMarkdown: Próba renderowania', displayText);
      
      // Sprawdź, czy ReactMarkdown działa poprawnie
      try {
        // Tymczasowy div dla sprawdzenia renderowania
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = displayText
          .replace(/#{1,6} ([^\n]+)/g, '<h2>$1</h2>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/- ([^\n]+)/g, '<li>$1</li>')
          .replace(/\n\n/g, '<br /><br />');
        
        console.log('DEBUG ReactMarkdown: Symulacja renderowania HTML:', tempDiv.innerHTML);
      } catch (error) {
        console.error('DEBUG ReactMarkdown: Błąd renderowania', error);
      }
    }
  }, [displayText, sender]);
  
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
          {isBot ? (
            <div className="debug-markdown-content">
              {/* Wyświetl surowy tekst dla debugowania */}
              <div className="debug-raw-content" style={{ display: 'none' }}>
                <h4>Surowy tekst:</h4>
                <pre>{text}</pre>
              </div>
              
              {/* Wyświetl przetworzony tekst dla debugowania */}
              <div className="debug-processed-content" style={{ display: 'none' }}>
                <h4>Przetworzony tekst:</h4>
                <pre>{displayText}</pre>
              </div>
              
              {/* Właściwe renderowanie Markdown */}
              <div className="markdown-content-debug">
                <ReactMarkdown>
                  {displayText}
                </ReactMarkdown>
              </div>
              
              {/* Ręczne renderowanie HTML dla debugowania */}
              <div className="debug-html-content" style={{ display: 'none' }}>
                <h4>Ręczne renderowanie HTML:</h4>
                <div dangerouslySetInnerHTML={{ 
                  __html: displayText
                    .replace(/#{1,6} ([^\n]+)/g, '<h2>$1</h2>')
                    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                    .replace(/- ([^\n]+)/g, '<li>$1</li>')
                    .replace(/\n\n/g, '<br /><br />') 
                }} />
              </div>
              
              {/* Dodatkowy CSS bezpośrednio w komponencie */}
              <style jsx global>{`
                .markdown-content-debug h1 {
                  font-size: 1.5rem;
                  font-weight: bold;
                  margin-top: 1rem;
                  margin-bottom: 0.5rem;
                  color: #ff0000; /* czerwony dla debugowania */
                }
                
                .markdown-content-debug h2 {
                  font-size: 1.25rem;
                  font-weight: bold;
                  margin-top: 1rem;
                  margin-bottom: 0.5rem;
                  color: #00ff00; /* zielony dla debugowania */
                }
                
                .markdown-content-debug h3 {
                  font-size: 1.1rem;
                  font-weight: bold;
                  margin-top: 0.75rem;
                  margin-bottom: 0.5rem;
                  color: #0000ff; /* niebieski dla debugowania */
                }
                
                .markdown-content-debug p {
                  margin-bottom: 0.75rem;
                  background-color: rgba(0, 0, 0, 0.05); /* jasnoszare tło dla debugowania */
                }
                
                .markdown-content-debug ul {
                  list-style-type: disc;
                  padding-left: 1.5rem;
                  margin-top: 0.5rem;
                  margin-bottom: 0.5rem;
                  border-left: 2px solid #ff00ff; /* różowa linia dla debugowania */
                }
                
                .markdown-content-debug ol {
                  list-style-type: decimal;
                  padding-left: 1.5rem;
                  margin-top: 0.5rem;
                  margin-bottom: 0.5rem;
                  border-left: 2px solid #00ffff; /* cyjanowa linia dla debugowania */
                }
                
                .markdown-content-debug li {
                  margin-bottom: 0.25rem;
                  border: 1px dashed rgba(0, 0, 0, 0.2); /* przerywana linia dla debugowania */
                }
                
                .markdown-content-debug strong {
                  font-weight: bold;
                  background-color: rgba(255, 255, 0, 0.3); /* żółte tło dla debugowania */
                }
                
                .markdown-content-debug em {
                  font-style: italic;
                  background-color: rgba(0, 255, 255, 0.3); /* cyjanowe tło dla debugowania */
                }
              `}</style>
            </div>
          ) : (
            <div className="text-white">
              {text}
            </div>
          )}
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

export default DebugChatMessage;