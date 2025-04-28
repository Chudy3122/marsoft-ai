// src/app/api/knowledge/extract-text/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";


export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
    }
    
    // Sprawdź, czy użytkownik ma rolę admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Brak pliku' }, { status: 400 });
    }
    
    // Sprawdź typ pliku
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Nieprawidłowy format pliku. Wymagany jest PDF.' }, { status: 400 });
    }
    
    try {
      // Konwertuj plik do bufora
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Dynamiczny import pdf-parse, aby uniknąć problemów z węzłami testowymi
      const pdfParse = (await import('pdf-parse')).default;
      
      // Użyj pdf-parse do ekstrakcji tekstu, z timeoutem
      const pdfData = await Promise.race([
        pdfParse(buffer, {
          // Opcje, które mogą pomóc uniknąć problemu z plikami testowymi
          max: 0, // nie limituj stron
          version: 'default' // nie szukaj wersji PDF
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout podczas przetwarzania PDF')), 15000)
        )
      ]) as any;
      
      return NextResponse.json({ 
        success: true,
        text: pdfData.text,
        pages: pdfData.numpages
      });
      
    } catch (error) {
      console.error('Błąd podczas przetwarzania PDF:', error);
      
      // Fallback - proste ekstrakcje tekstu
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const textDecoder = new TextDecoder();
        
        // Próba prostej ekstrakcji tekstu
        const simpleText = textDecoder.decode(buffer)
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Usuń kontrolne znaki
          .replace(/\s+/g, ' '); // Normalizuj białe znaki
        
        return NextResponse.json({ 
          success: true,
          text: `Uwaga: Użyto uproszczonej metody ekstrakcji tekstu.\n\n${simpleText}`,
          pages: 1
        });
      } catch (fallbackError) {
        return NextResponse.json({ 
          error: 'Nie udało się przetworzyć PDF', 
          details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Ogólny błąd podczas ekstrakcji tekstu:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas ekstrakcji tekstu',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}