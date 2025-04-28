// src/app/api/process-pdf/route.ts
import { NextResponse } from 'next/server';
import { PdfReader } from 'pdfreader';


export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    // Odczytanie formularza z pliku
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Brak pliku' }, { status: 400 });
    }
    
    // Sprawdzenie typu pliku - obsługuj zarówno type jak i nazwę pliku
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Nieprawidłowy format pliku. Wymagany PDF.' }, { status: 400 });
    }
    
    // Konwersja pliku do ArrayBuffer i potem do Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Ekstrakcja tekstu z PDF
    return extractTextFromPdf(buffer, file);
    
  } catch (error) {
    console.error('Błąd podczas przetwarzania PDF:', error);
    return NextResponse.json({ 
      error: 'Błąd podczas przetwarzania PDF', 
      message: (error as Error).message 
    }, { status: 500 });
  }
}

async function extractTextFromPdf(buffer: Buffer, file: File) {
  return new Promise<NextResponse>((resolve, reject) => {
    try {
      const reader = new PdfReader();
      
      let text = '';
      let pageNumber = 1;
      let currentPage = '';
      
      reader.parseBuffer(buffer, (err: any, item: any) => {
        if (err) {
          console.error("Error during parsing:", err);
          // Kontynuuj parsowanie pomimo błędów
          return;
        }
        
        if (!item) {
          // Koniec dokumentu
          if (currentPage) {
            text += `[Strona ${pageNumber}]\n${currentPage}\n\n`;
          }
          
          console.log(`Zakończono ekstrakcję tekstu z PDF. Wyekstrahowano ${pageNumber} stron, ${text.length} znaków.`);
          
          if (text.length === 0) {
            text = "Ten dokument PDF nie zawiera tekstu, który można wyodrębnić.";
          }
          
          resolve(NextResponse.json({
            text,
            metadata: {
              title: file.name,
              pages: pageNumber,
              size: file.size,
              type: file.type
            }
          }));
          return;
        }
        
        if (item.page) {
          if (item.page > pageNumber) {
            // Nowa strona
            text += `[Strona ${pageNumber}]\n${currentPage}\n\n`;
            currentPage = '';
            pageNumber = item.page;
          }
        }
        
        if (item.text) {
          currentPage += item.text + ' ';
        }
      });
    } catch (error) {
      reject(NextResponse.json({ 
        error: 'Błąd podczas ekstrakcji tekstu', 
        message: (error as Error).message 
      }, { status: 500 }));
    }
  });
}