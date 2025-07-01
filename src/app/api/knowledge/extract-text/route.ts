// src/app/api/knowledge/extract-text/route.ts - NAPRAWIONA WERSJA
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// 🔥 GLOBALNA NAPRAWA pdf-parse - wykonuje się tylko raz
let pdfParseFixed = false;

function fixPdfParse() {
  if (pdfParseFixed) return;
  
  console.log('🔧 Naprawiam pdf-parse w extract-text...');
  
  // Przechwyć tylko problematyczne odczyty dla pdf-parse
  const originalReadFileSync = require('fs').readFileSync;
  
  require('fs').readFileSync = function(path: string, options?: any) {
    // Jeśli pdf-parse próbuje odczytać swój problematyczny plik testowy
    if (typeof path === 'string' && path.includes('test/data') && path.includes('versions-space')) {
      console.log(`🔧 Przechwycono problematyczną ścieżkę pdf-parse: ${path}`);
      // Zwróć pusty buffer - pdf-parse będzie działać normalnie
      return Buffer.from('');
    }
    
    // Wszystkie inne pliki - normalny odczyt
    return originalReadFileSync.apply(this, arguments);
  };
  
  pdfParseFixed = true;
  console.log('✅ pdf-parse naprawiony w extract-text');
}

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
    
    console.log(`🔍 === EXTRACT-TEXT START ===`);
    console.log(`📄 Plik: ${file.name}`);
    console.log(`📦 Rozmiar: ${file.size} bajtów`);
    
    try {
      // Konwertuj plik do bufora
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      console.log(`📦 Buffer utworzony: ${buffer.length} bajtów`);
      
      // Sprawdź nagłówek PDF
      const header = buffer.slice(0, 4).toString('ascii');
      console.log(`📋 Nagłówek PDF: "${header}"`);
      
      if (!header.startsWith('%PDF')) {
        console.log(`❌ Nieprawidłowy nagłówek PDF`);
        return NextResponse.json({ 
          error: 'Nieprawidłowy format pliku PDF' 
        }, { status: 400 });
      }
      
      // 🔥 NAPRAWA: Zastosuj fix przed importem pdf-parse
      fixPdfParse();
      
      // Dynamiczny import pdf-parse
      console.log(`📚 Import pdf-parse...`);
      const pdfParse = (await import('pdf-parse')).default;
      console.log(`✅ pdf-parse zaimportowany`);
      
      // 🔥 NAPRAWIONE: Użyj pdf-parse BEZ problematycznych opcji
      console.log(`🔄 Rozpoczynam parsowanie PDF...`);
      const pdfData = await Promise.race([
        // ✅ USUNIĘTO problematyczne opcje - używamy domyślnych ustawień
        pdfParse(buffer),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout podczas przetwarzania PDF')), 15000)
        )
      ]) as any;
      
      console.log(`📊 Wyniki parsowania:`);
      console.log(`   - Strony: ${pdfData.numpages}`);
      console.log(`   - Długość tekstu: ${pdfData.text?.length || 0} znaków`);
      console.log(`   - Ma tekst: ${!!pdfData.text}`);
      
      if (pdfData.text && pdfData.text.length > 0) {
        console.log(`   - Początek tekstu: "${pdfData.text.substring(0, 100)}..."`);
      }
      
      if (!pdfData.text || pdfData.text.trim().length === 0) {
        console.log(`⚠️ PDF nie zawiera tekstu (możliwy skan)`);
        return NextResponse.json({ 
          success: true,
          text: 'PDF nie zawiera tekstu do wyodrębnienia. Możliwe przyczyny:\n- PDF jest skanowany (składa się z obrazów)\n- PDF jest zabezpieczony\n- PDF zawiera tylko grafiki',
          pages: pdfData.numpages || 1,
          warning: 'Brak tekstu w PDF'
        });
      }
      
      console.log(`✅ Parsowanie zakończone pomyślnie`);
      console.log(`🔍 === EXTRACT-TEXT SUCCESS ===`);
      
      return NextResponse.json({ 
        success: true,
        text: pdfData.text,
        pages: pdfData.numpages,
        pdfParseFixed: pdfParseFixed
      });
      
    } catch (error) {
      console.error('❌ Błąd podczas przetwarzania PDF:', error);
      console.error('❌ Szczegóły błędu:', {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : 'No stack'
      });
      
      // 🔥 NAPRAWIONY FALLBACK - zwróć sensowny błąd
      console.log(`⚠️ Fallback: zwracam błąd ekstrakcji`);
      return NextResponse.json({ 
        success: false,
        error: 'Nie udało się wyekstraktować tekstu z PDF', 
        details: error instanceof Error ? error.message : String(error),
        suggestion: 'Sprawdź czy plik nie jest uszkodzony lub spróbuj z innym PDF'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Ogólny błąd podczas ekstrakcji tekstu:', error);
    console.log(`🔍 === EXTRACT-TEXT ERROR ===`);
    
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas ekstrakcji tekstu',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}