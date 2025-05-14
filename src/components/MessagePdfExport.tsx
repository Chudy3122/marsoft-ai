// src/components/MessagePdfExport.tsx

import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';

interface MessageExportProps {
  messageContent: string;
  fileName?: string;
  small?: boolean;
}

const MessagePdfExport: React.FC<MessageExportProps> = ({ 
  messageContent, 
  fileName = 'dokument.pdf',
  small = false
}) => {
  const exportToPdf = () => {
    // Inicjalizacja dokumentu PDF w formacie A4
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Ustawienie metadanych
    doc.setProperties({
      title: fileName,
      subject: 'Dokument wygenerowany przez MarsoftAI',
      author: 'MarsoftAI',
      creator: 'MarsoftAI'
    });
    
    // Definicja marginesów
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - 2 * margin;
    
    // Nagłówek
    doc.setFontSize(16);
    doc.setTextColor(0, 84, 159); // kolor firmowy
    doc.text('MarsoftAI - Wygenerowany dokument', pageWidth / 2, margin, { align: 'center' });
    
    // Data wygenerowania
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Wygenerowano: ${new Date().toLocaleString('pl-PL')}`, pageWidth / 2, margin + 7, { align: 'center' });
    
    // Linia oddzielająca
    doc.setDrawColor(0, 84, 159);
    doc.line(margin, margin + 10, pageWidth - margin, margin + 10);
    
    // Treść wiadomości
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    
    // Konwersja znaczników Markdown na formatowanie PDF
    // To jest podstawowa implementacja - dla bardziej zaawansowanego renderowania Markdown
    // warto rozważyć bibliotekę markdown-to-pdf lub podobną
    const formattedContent = messageContent
      .replace(/\*\*(.*?)\*\*/g, '$1') // usunięcie pogrubienia (jsPDF obsłuży to osobno)
      .replace(/\n## (.*?)\n/g, '\n$1\n') // zamiana nagłówków drugiego poziomu na zwykły tekst
      .replace(/\n### (.*?)\n/g, '\n$1\n') // zamiana nagłówków trzeciego poziomu
      .trim();
    
    // Użycie splitTextToSize do łamania tekstu
    const textLines = doc.splitTextToSize(formattedContent, contentWidth);
    
    // Oblicz wysokość tekstu
    const textHeight = textLines.length * 7; // przybliżona wysokość linii
    
    // Jeśli tekst nie mieści się na jednej stronie, użyj funkcji automatycznego podziału
    if (textHeight > pageHeight - margin * 2 - 20) {
      let startY = margin + 20;
      let currentPage = 1;
      
      for (let i = 0; i < textLines.length; i++) {
        // Jeśli osiągnięto koniec strony, dodaj nową
        if (startY > pageHeight - margin) {
          doc.addPage();
          currentPage++;
          startY = margin;
          
          // Dodaj numer strony
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`Strona ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
        
        // Dodaj linię tekstu
        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        doc.text(textLines[i], margin, startY);
        startY += 7; // zwiększ pozycję Y dla następnej linii
      }
    } else {
      // Jeśli tekst mieści się na jednej stronie
      doc.text(textLines, margin, margin + 20);
    }
    
    // Dodaj numer strony na pierwszej stronie
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Strona 1', pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Stopka
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('© MarsoftAI - dokument wygenerowany automatycznie', pageWidth / 2, pageHeight - 5, { align: 'center' });
    
    // Zapisz PDF
    doc.save(fileName);
  };
  
  return (
    <button
      onClick={exportToPdf}
      className={`flex items-center justify-center ${small ? 'p-1.5' : 'p-2'} bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 ${small ? 'text-xs' : 'text-sm'}`}
      title="Zapisz jako PDF"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={small ? 14 : 16} 
        height={small ? 14 : 16} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      {!small && <span className="ml-1">PDF</span>}
    </button>
  );
};

export default MessagePdfExport;