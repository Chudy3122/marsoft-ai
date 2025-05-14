// src/app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Stałe kolorów firmowych
const PRIMARY_COLOR: [number, number, number] = [0, 84, 159];  // #00549F
const ACCENT_COLOR: [number, number, number] = [163, 205, 57]; // #A3CD39

// Definicje typów dla tabeli
interface TableRow {
  [key: string]: string | number | boolean | null | undefined;
}

export async function POST(request: NextRequest) {
  try {
    // Sprawdź czy użytkownik jest zalogowany
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Pobierz dane z żądania
    const data = await request.json();
    const { 
      title = 'Dokument MarsoftAI',
      content,
      chatId,
      addToChat = true,
      addTable = false,
      tableData = [] as TableRow[],
      tableColumns = [] as string[],
    } = data;
    
    // Sprawdź, czy content został dostarczony
    if (!content) {
      return NextResponse.json(
        { error: 'Brak treści dokumentu' },
        { status: 400 }
      );
    }
    
    // Funkcja do kodowania polskich znaków
    const polishEncoding = (text: string): string => {
      // Mapa odpowiedników dla polskich znaków - jeśli standard Unicode nie działa
      // Uwaga: W najnowszych wersjach jsPDF obsługa polskich znaków jest wbudowana
      const polishCharsMap: { [key: string]: string } = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
      };
      
      // Funkcja zamiany
      return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (match) => polishCharsMap[match] || match);
    };
    
    // Generuj PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    });
    
    // Ustawienie metadanych
    doc.setProperties({
      title: title,
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
      hour: '2-digit', minute: '2-digit', second: '2-digit'
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
      const processedColumnHeaders = tableColumns.map((col: string) => polishEncoding(col));
      const processedTableData = tableData.map((row: TableRow) => {
        return tableColumns.map((col: string) => polishEncoding(String(row[col] || '')));
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
    }
    
    // Wygeneruj plik
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    // Jeśli żądanie zawiera chatId i addToChat=true, zapisz PDF jako dokument w bazie
    if (chatId && addToChat) {
      try {
        // Sprawdź czy czat należy do tego użytkownika
        const chat = await prisma.chat.findFirst({
          where: {
            id: chatId,
            userId: session.user.id
          }
        });
        
        if (!chat) {
          return NextResponse.json(
            { error: 'Czat nie istnieje lub brak uprawnień' },
            { status: 403 }
          );
        }
        
        // Przygotuj liczbę stron
        const pageCount = doc.getNumberOfPages();
        
        // Zapisz dokument w bazie
        const document = await prisma.document.create({
          data: {
            title: title,
            fileType: 'pdf',
            content: content,
            pages: pageCount,
            chatId: chatId,
            metadata: { 
              generatedBy: 'api',
              generatedAt: new Date().toISOString(),
              pageCount: pageCount
            }
          }
        });
        
        // Pobierz aktualne aktywne dokumenty czatu
        const chatData = await prisma.chat.findUnique({
          where: { id: chatId },
          select: { activeDocuments: true }
        });
        
        // Przygotuj zaktualizowaną listę dokumentów
        let updatedActiveDocuments = [...(chatData?.activeDocuments || [])];
        
        // Dodaj nowy dokument tylko jeśli jeszcze nie istnieje
        if (!updatedActiveDocuments.includes(document.id)) {
          updatedActiveDocuments.push(document.id);
        }
        
        // Zaktualizuj dokumenty czatu
        await prisma.chat.update({
          where: { id: chatId },
          data: {
            activeDocuments: updatedActiveDocuments
          }
        });
        
        // Dodaj wiadomość o wygenerowaniu dokumentu
        await prisma.message.create({
          data: {
            chatId: chatId,
            role: 'assistant',
            content: `Wygenerowałem dokument PDF "${title}". Dokument został dodany do aktywnych dokumentów tej konwersacji.`
          }
        });
        
        // Zwróć odpowiedź z PDF i ID dokumentu
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
            'Document-Id': document.id
          }
        });
      } catch (dbError) {
        console.error('Błąd podczas zapisywania PDF w bazie:', dbError);
        return NextResponse.json(
          { error: 'Błąd podczas zapisywania dokumentu w bazie danych' },
          { status: 500 }
        );
      }
    }
    
    // Jeśli nie zapisujemy w bazie, zwróć tylko PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`
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