// src/app/api/document/[id]/pdf/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const prisma = new PrismaClient();

// Stałe kolorów firmowych
const PRIMARY_COLOR: [number, number, number] = [0, 84, 159];  // #00549F
const ACCENT_COLOR: [number, number, number] = [163, 205, 57]; // #A3CD39

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sprawdź czy użytkownik jest zalogowany
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const documentId = params.id;
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Missing document ID' },
        { status: 400 }
      );
    }
    
    // Pobierz dokument z bazy danych
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        chat: {
          userId: session.user.id
        }
      },
      include: {
        chat: true
      }
    });
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }
    
    // Funkcja do kodowania polskich znaków
    const polishEncoding = (text: string): string => {
      // Mapa odpowiedników dla polskich znaków
      const polishCharsMap: { [key: string]: string } = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
      };
      
      // Funkcja zamiany
      return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (match) => polishCharsMap[match] || match);
    };
    
    // Wygeneruj PDF na podstawie zawartości dokumentu
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    });
    
    // Ustawienie metadanych
    doc.setProperties({
      title: document.title,
      subject: 'Dokument wygenerowany przez MarsoftAI',
      author: session.user.name || 'MarsoftAI',
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
      const footerText = polishEncoding(`© MarsoftAI - dokument wygenerowany automatycznie`);
      doc.text(footerText, margin, pageHeight - 7);
      
      // Numer strony
      doc.text(`Strona ${pageNumber}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    };
    
    // Dodanie pierwszej strony
    addHeaderAndFooter(1);
    
    // Dodanie tytułu dokumentu
    doc.setFontSize(18);
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.text(polishEncoding(document.title), pageWidth / 2, 15, { align: 'center' });
    
    // Dodanie daty
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const dateText = polishEncoding(`Wygenerowano: ${new Date(document.createdAt).toLocaleString('pl-PL', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })}`);
    doc.text(dateText, pageWidth / 2, 20, { align: 'center' });
    
    // Przetwarzanie treści dokumentu
    const processMarkdown = (text: string): string => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '$1')  // usunięcie pogrubienia
        .replace(/\_(.*?)\_/g, '$1')      // usunięcie kursywy
        .replace(/\`(.*?)\`/g, '$1')      // usunięcie inline code
        .replace(/\n## (.*?)\n/g, '\n$1\n')  // zamiana nagłówków 2-go poziomu
        .replace(/\n### (.*?)\n/g, '\n$1\n') // zamiana nagłówków 3-go poziomu
        .trim();
    };
    
    // Treść
    if (document.content) {
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      
      // Przetworz treść
      const cleanContent = processMarkdown(document.content);
      
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
        
        // Zastosuj kodowanie polskich znaków
        const processedText = polishEncoding(text);
        
        // Podziel na linie
        const textLines = doc.splitTextToSize(processedText, contentWidth);
        
        // Oblicz wysokość tekstu
        const textHeight = textLines.length * (isHeading ? 7 : 5.5);
        
        // Sprawdź czy potrzebna jest nowa strona
        checkNewPage(textHeight + 5);
        
        // Dodaj tekst
        doc.text(textLines, margin, yPos);
        
        // Zaktualizuj pozycję Y
        yPos += textHeight + 6;
      }
    }
    
    // Generuj PDF jako ArrayBuffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    // Zwróć PDF jako odpowiedź
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`
      }
    });
    
  } catch (error) {
    console.error('Błąd podczas generowania PDF:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas generowania PDF' },
      { status: 500 }
    );
  }
}