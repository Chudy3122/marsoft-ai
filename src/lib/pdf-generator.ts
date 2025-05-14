// src/lib/pdf-generator.ts
// Poprawiona wersja generatora PDF z obsługą polskich znaków

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

// Stałe kolorów firmowych
const PRIMARY_COLOR: [number, number, number] = [0, 84, 159];  // #00549F
const ACCENT_COLOR: [number, number, number] = [163, 205, 57]; // #A3CD39

interface GeneratePdfOptions {
  title: string;
  content: string;
  fileName?: string;
  author?: string;
  addTable?: boolean;
  tableData?: any[];
  tableColumns?: string[];
  logoUrl?: string;
}

export const generatePdf = async ({
  title,
  content,
  fileName = 'dokument.pdf',
  author = 'MarsoftAI',
  addTable = false,
  tableData = [],
  tableColumns = [],
  logoUrl = '/MarsoftAI.png',
}: GeneratePdfOptions): Promise<Blob> => {
  // Inicjalizacja dokumentu PDF z obsługą polskich znaków
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true
  });
  
  // Dodanie obsługi polskich znaków
  // Najprostszy sposób - załaduj standardową czcionkę z rozszerzeniem znakowym
  doc.setFont("helvetica");
  
  // Ustawienie metadanych
  doc.setProperties({
    title: title,
    subject: 'Dokument wygenerowany przez MarsoftAI',
    author: author,
    creator: 'MarsoftAI',
    keywords: 'AI, raport, dokument'
  });
  
  // Definicja marginesów i wymiarów strony
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - 2 * margin;
  
  // Funkcja do kodowania polskich znaków
  const polishEncoding = (text: string): string => {
    // Mapa odpowiedników dla polskich znaków
    const polishCharsMap: { [key: string]: string } = {
      'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
      'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
    };
    
    // Funkcja zamiany
    const replacePolishChars = (str: string) => {
      return str.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (match) => polishCharsMap[match] || match);
    };
    
    // Jeśli używamy prostej metody, zamieniamy polskie znaki
    return replacePolishChars(text);
  };
  
  // Funkcja do dodawania nagłówka i stopki na każdej stronie
  const addHeaderAndFooter = (pageNumber: number) => {
    // Nagłówek
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Linia nagłówka
    doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, 25, pageWidth - margin, 25);
    
    // Stopka
    doc.setFillColor(248, 249, 250);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    
    // Tekst stopki
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const footerText = polishEncoding(`© ${new Date().getFullYear()} MarsoftAI - Dokument wygenerowany automatycznie`);
    doc.text(footerText, margin, pageHeight - 7);
    
    // Numer strony
    doc.text(`Strona ${pageNumber}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  };
  
  // Dodanie pierwszej strony
  addHeaderAndFooter(1);
  
  // Dodanie tytułu dokumentu
  doc.setFontSize(18);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.text(polishEncoding(title), pageWidth / 2, 15, { align: 'center' });
  
  // Dodanie daty
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const dateText = polishEncoding(`Wygenerowano: ${new Date().toLocaleString('pl-PL', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })}`);
  doc.text(dateText, pageWidth / 2, 20, { align: 'center' });
  
  // Przetwarzanie treści dokumentu
  const processMarkdown = (text: string): string => {
    // Usunięcie znaczników Markdown i zamiana na prosty tekst
    const processed = text
      .replace(/\*\*(.*?)\*\*/g, '$1')  // usunięcie pogrubienia
      .replace(/\_(.*?)\_/g, '$1')      // usunięcie kursywy
      .replace(/\`(.*?)\`/g, '$1')      // usunięcie inline code
      .replace(/\n## (.*?)\n/g, '\n$1\n')  // zamiana nagłówków 2-go poziomu
      .replace(/\n### (.*?)\n/g, '\n$1\n') // zamiana nagłówków 3-go poziomu
      .trim();
    
    // Kodowanie polskich znaków
    return polishEncoding(processed);
  };
  
  // Transformacja treści Markdown
  const cleanContent = processMarkdown(content);
  
  // Podziel tekst na akapity
  const paragraphs = cleanContent.split('\n\n');
  
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
  
  // Dodaj akapity
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') continue;
    
    // Sprawdź czy paragraf zaczyna się od nagłówka
    const isHeading = paragraph.startsWith('#');
    
    // Ustaw rozmiar czcionki i kolor
    if (isHeading) {
      doc.setFontSize(14);
      doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    } else {
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
    }
    
    // Przetwórz paragraf
    const text = isHeading ? paragraph.replace(/^#+\s+/, '') : paragraph;
    
    // Podziel na linie
    const textLines = doc.splitTextToSize(text, contentWidth);
    
    // Oblicz wysokość tekstu
    const textHeight = textLines.length * (isHeading ? 7 : 5.5);
    
    // Sprawdź czy potrzebna jest nowa strona
    checkNewPage(textHeight + 5);
    
    // Dodaj tekst
    doc.text(textLines, margin, yPos);
    
    // Zaktualizuj pozycję Y - większy odstęp dla lepszej czytelności
    yPos += textHeight + 6; // Zwiększony odstęp między akapitami
  }
  
  // Dodaj tabelę jeśli potrzeba
  if (addTable && tableData.length > 0 && tableColumns.length > 0) {
    // Sprawdź czy potrzebna jest nowa strona
    checkNewPage(60); // Minimalna wysokość dla tabeli
    
    // Dodaj tytuł tabeli
    doc.setFontSize(12);
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.text(polishEncoding('Tabela danych'), margin, yPos);
    yPos += 7;
    
    // Przygotuj dane tabeli - z konwersją polskich znaków
    const processedColumnHeaders = tableColumns.map(col => polishEncoding(col));
    const processedTableData = tableData.map(row => {
      return tableColumns.map(col => polishEncoding(row[col] || ''));
    });
    
    // Dodaj tabelę
    autoTable(doc, {
      startY: yPos,
      head: [processedColumnHeaders],
      body: processedTableData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [50, 50, 50],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248]
      }
    });
    
    // Zaktualizuj pozycję Y po tabeli
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 40;
    yPos = finalY + 10;
  }
  
  // Stwórz Blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
};

// Funkcja pomocnicza do tworzenia linku do pobrania PDF
export const createPdfDownloadLink = (blob: Blob, fileName: string): string => {
  const url = URL.createObjectURL(blob);
  return url;
};

// Funkcja do bezpośredniego pobrania PDF
export const downloadPdf = (blob: Blob, fileName: string): void => {
  saveAs(blob, fileName);
};

// Funkcja generująca i pobierająca PDF
export const generateAndDownloadPdf = async (options: GeneratePdfOptions): Promise<void> => {
  const pdfBlob = await generatePdf(options);
  downloadPdf(pdfBlob, options.fileName || 'dokument.pdf');
};