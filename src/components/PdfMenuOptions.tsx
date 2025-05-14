// src/components/PdfMenuOptions.tsx
import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Message } from '../types';

interface PdfMenuOptionsProps {
  messages: Message[];
  chatId: string;
  chatTitle: string;
}

const PdfMenuOptions: React.FC<PdfMenuOptionsProps> = ({ 
  messages, 
  chatId, 
  chatTitle 
}) => {
  const [isExporting, setIsExporting] = useState(false);

  // Formatowanie daty
  const formatDate = (date: Date): string => {
    return date.toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Eksport całej konwersacji do PDF
  const exportChatToPdf = async () => {
    if (messages.length === 0) {
      alert('Brak wiadomości do eksportu');
      return;
    }

    try {
      setIsExporting(true);

      // Inicjalizacja dokumentu PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Ustawienie metadanych
      doc.setProperties({
        title: `Konwersacja: ${chatTitle}`,
        subject: 'Eksport konwersacji z MarsoftAI',
        author: 'MarsoftAI',
        creator: 'MarsoftAI'
      });

      // Definicja marginesów i wymiarów strony
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const contentWidth = pageWidth - 2 * margin;

      // Funkcja do dodawania nagłówka i stopki na każdej stronie
      const addHeaderAndFooter = (pageNumber: number) => {
        // Nagłówek
        doc.setFillColor(248, 249, 250);
        doc.rect(0, 0, pageWidth, 25, 'F');
        
        doc.setFontSize(16);
        doc.setTextColor(0, 84, 159);
        doc.text('MarsoftAI - Eksport konwersacji', pageWidth / 2, 15, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Temat: ${chatTitle}`, pageWidth / 2, 22, { align: 'center' });
        
        // Linia oddzielająca
        doc.setDrawColor(0, 84, 159);
        doc.line(margin, 25, pageWidth - margin, 25);
        
        // Stopka
        doc.setFillColor(248, 249, 250);
        doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Wygenerowano: ${new Date().toLocaleString('pl-PL')}`, margin, pageHeight - 10);
        doc.text(`Strona ${pageNumber}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      };

      // Dodaj pierwszą stronę z nagłówkiem
      addHeaderAndFooter(1);

      // Początkowa pozycja Y
      let yPos = 35;

      // Funkcja sprawdzająca czy potrzebna jest nowa strona
      const checkNewPage = (heightNeeded: number): boolean => {
        if (yPos + heightNeeded > pageHeight - 20) {
          doc.addPage();
          const pageCount = doc.getNumberOfPages();
          addHeaderAndFooter(pageCount);
          yPos = 35;
          return true;
        }
        return false;
      };

      // Renderuj wiadomości
      for (const message of messages) {
        const isBot = message.sender === 'bot';
        const messageContent = message.text.trim();
        
        if (messageContent === '') continue;
        
        // Dodaj informację o nadawcy i czasie
        const senderInfo = isBot ? 'MarsoftAI' : 'Użytkownik';
        const timestamp = formatDate(message.timestamp);
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        
        const infoText = `${senderInfo} - ${timestamp}`;
        
        // Sprawdź czy potrzebna jest nowa strona dla etykiety nadawcy
        checkNewPage(5);
        
        // Stylizowany box z informacją o nadawcy
        if (isBot) {
          doc.setFillColor(240, 249, 255); // Jasny niebieski
          doc.setDrawColor(213, 232, 250);
        } else {
          doc.setFillColor(240, 255, 244); // Jasny zielony
          doc.setDrawColor(213, 250, 226);
        }
        
        // Rysuj zaokrąglony prostokąt dla informacji o nadawcy
        doc.roundedRect(margin, yPos - 3, 50, 6, 1, 1, 'FD');
        doc.text(infoText, margin + 3, yPos);
        
        yPos += 8;
        
        // Treść wiadomości
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        
        // Przetwarzanie treści Markdown
        const formattedContent = messageContent
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\n## (.*?)\n/g, '\n$1\n')
          .replace(/\n### (.*?)\n/g, '\n$1\n')
          .trim();
        
        // Podziel na linie
        const textLines = doc.splitTextToSize(formattedContent, contentWidth);
        
        // Oblicz wysokość tekstu
        const textHeight = textLines.length * 5 + 10; // wysokość linii + margines
        
        // Sprawdź czy potrzebna jest nowa strona
        checkNewPage(textHeight);
        
        // Stylizowany box z wiadomością
        if (isBot) {
          doc.setFillColor(248, 250, 252); // Biały z odcieniem niebieskiego
          doc.setDrawColor(226, 232, 240);
        } else {
          doc.setFillColor(250, 252, 248); // Biały z odcieniem zielonego
          doc.setDrawColor(232, 240, 226);
        }
        
        // Rysuj zaokrąglony prostokąt dla wiadomości
        doc.roundedRect(margin, yPos - 3, contentWidth, textHeight, 2, 2, 'FD');
        
        // Dodaj tekst
        doc.text(textLines, margin + 5, yPos + 3);
        
        // Zaktualizuj pozycję Y
        yPos += textHeight + 10;
      }

      // Zapisz PDF
      doc.save(`konwersacja-${chatId}.pdf`);
    } catch (error) {
      console.error('Błąd podczas eksportu PDF:', error);
      alert('Wystąpił problem podczas eksportu PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="pdf-menu-options">
      <button
        onClick={exportChatToPdf}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors w-full"
      >
        {isExporting ? (
          <>
            <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Eksportowanie...</span>
          </>
        ) : (
          <>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-red-600"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Eksportuj czat do PDF</span>
          </>
        )}
      </button>
    </div>
  );
};

export default PdfMenuOptions;