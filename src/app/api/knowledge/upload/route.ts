// app/api/knowledge/upload/route.ts - FINALNA NAPRAWIONA WERSJA
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export const maxDuration = 60;
export const runtime = 'nodejs';

function createFallbackText(fileName: string, reason: string, pages?: number, error?: any): string {
  let fallbackText = `# Dokument: ${fileName}\n\n`;

  switch (reason) {
    case 'PDF_PARSE_MISSING':
      fallbackText += `**Status:** Brak biblioteki pdf-parse\n\nBiblioteka do odczytu PDF nie jest dostępna na serwerze.\n\n`;
      break;
    case 'EMPTY_BUFFER':
      fallbackText += `**Status:** Błąd odczytu pliku - bufor jest pusty.\n\n`;
      break;
    case 'INVALID_HEADER':
      fallbackText += `**Status:** Nieprawidłowy nagłówek PDF\n\nTo nie jest poprawny plik PDF.\n\n`;
      break;
    case 'NO_TEXT_EXTRACTED':
      fallbackText += `**Status:** PDF skanowany (obrazkowy)\n\nNie znaleziono tekstu do wyodrębnienia z dokumentu PDF.\n\n`;
      break;
    case 'EXTRACTION_ERROR':
      fallbackText += `**Status:** Błąd ekstrakcji: ${error?.message || error}\n\n`;
      break;
    default:
      fallbackText += `**Status:** Nieznany problem podczas przetwarzania pliku.\n\n`;
  }

  fallbackText += `*Dokument został zapisany, ale zawartość musi zostać opisana ręcznie.*`;
  return fallbackText;
}

// 🔥 GLOBALNA NAPRAWA pdf-parse - wykonuje się tylko raz
let pdfParseFixed = false;

function fixPdfParse() {
  if (pdfParseFixed) return;
  
  console.log('🔧 Naprawiam pdf-parse...');
  
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
  console.log('✅ pdf-parse naprawiony - problematyczne odczyty będą omijane');
}

async function extractTextFromPDF(buffer: Buffer, fileName: string): Promise<string> {
  console.log(`🔍 === START extractTextFromPDF ===`);
  console.log(`📄 Plik: ${fileName}`);
  console.log(`📦 Rozmiar bufora: ${buffer.length} bajtów`);

  // Sprawdź bufor
  if (!buffer || buffer.length === 0) {
    console.log(`❌ Pusty bufor`);
    return createFallbackText(fileName, 'EMPTY_BUFFER');
  }

  // Sprawdź nagłówek PDF
  const header = buffer.slice(0, 4).toString('ascii');
  console.log(`📋 Nagłówek pliku: "${header}"`);
  
  if (!header.startsWith('%PDF')) {
    console.log(`❌ Nieprawidłowy nagłówek PDF`);
    return createFallbackText(fileName, 'INVALID_HEADER');
  }

  try {
    console.log(`📚 Próba importu pdf-parse...`);
    
    // 🔥 NAPRAWA: Zastosuj fix przed importem pdf-parse
    fixPdfParse();
    
    const pdfParse = (await import('pdf-parse')).default;
    console.log(`✅ pdf-parse zaimportowany pomyślnie`);

    console.log(`🔄 Rozpoczynam ekstrakcję tekstu...`);
    // Użyj pdf-parse bez problematycznych opcji
    const result = await pdfParse(buffer);
    
    console.log(`📊 Wyniki ekstrakcji:`);
    console.log(`   - Liczba stron: ${result.numpages}`);
    console.log(`   - Długość tekstu: ${result.text?.length || 0} znaków`);
    console.log(`   - Ma tekst: ${!!result.text}`);
    
    // Pokaż początek tekstu dla diagnostyki
    if (result.text && result.text.length > 0) {
      console.log(`   - Początek tekstu: "${result.text.substring(0, 100)}..."`);
    }

    if (!result.text || result.text.trim().length === 0) {
      console.log(`⚠️ Brak tekstu w PDF - prawdopodobnie skanowany`);
      return createFallbackText(fileName, 'NO_TEXT_EXTRACTED', result.numpages);
    }

    const extractedText = `# PDF: ${fileName}\n\n**Strony:** ${result.numpages}\n\n**Zawartość:**\n\n${result.text.trim()}`;
    
    console.log(`✅ Ekstrakcja pomyślna: ${extractedText.length} znaków łącznie`);
    console.log(`🔍 === END extractTextFromPDF ===`);
    
    return extractedText;
    
  } catch (err) {
    console.log(`❌ Błąd podczas ekstrakcji:`);
    console.log(`   - Typ błędu: ${err instanceof Error ? err.name : typeof err}`);
    console.log(`   - Wiadomość: ${err instanceof Error ? err.message : String(err)}`);
    if (err instanceof Error && err.stack) {
      console.log(`   - Stack trace: ${err.stack.split('\n').slice(0, 3).join('\n')}`);
    }
    
    console.log(`🔍 === END extractTextFromPDF (ERROR) ===`);
    return createFallbackText(fileName, 'EXTRACTION_ERROR', undefined, err);
  }
}

export async function POST(request: NextRequest) {
  console.log('🔥 === START upload endpoint ===');
  
  try {
    // 1. Sprawdź autoryzację
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ Brak autoryzacji');
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    console.log(`👤 Użytkownik: ${session.user.email}`);

    // 2. Pobierz dane z formularza
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const categoryId = formData.get('categoryId') as string;

    console.log(`📄 Dane formularza:`);
    console.log(`   - Plik: ${file?.name || 'brak'} (${file?.size || 0} bajtów)`);
    console.log(`   - Tytuł: "${title || 'brak'}"`);
    console.log(`   - Kategoria ID: ${categoryId || 'brak'}`);

    if (!file || !title || !categoryId) {
      console.log('❌ Brak wymaganych pól');
      return NextResponse.json({ error: 'Brak wymaganych pól' }, { status: 400 });
    }

    // 3. Sprawdź dostęp do kategorii
    console.log(`🔍 Sprawdzam kategorię ${categoryId}...`);
    const category = await prisma.knowledgeCategory.findUnique({ 
      where: { id: categoryId } 
    });

    if (!category) {
      console.log('❌ Kategoria nie znaleziona');
      return NextResponse.json({ error: 'Kategoria nie została znaleziona' }, { status: 404 });
    }

    if (!category.isPublic && category.createdBy !== session.user.email) {
      console.log('❌ Brak dostępu do kategorii');
      return NextResponse.json({ error: 'Brak dostępu do kategorii' }, { status: 403 });
    }

    console.log(`✅ Kategoria OK: "${category.name}" (${category.isPublic ? 'publiczna' : 'prywatna'})`);

    // 4. Przetwórz plik
    console.log(`🔄 Przetwarzam plik...`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');

    console.log(`📦 Plik przetworzony:`);
    console.log(`   - Rozmiar bufora: ${buffer.length} bajtów`);
    console.log(`   - Rozmiar base64: ${base64.length} znaków`);
    console.log(`   - Typ MIME: ${file.type}`);

    // 5. Ekstraktuj tekst
    console.log(`🔍 Rozpoczynam ekstrakcję tekstu...`);
    let content = '';
    
    if (file.type === 'application/pdf') {
      console.log(`📄 Wykryto PDF - ekstraktuję tekst`);
      content = await extractTextFromPDF(buffer, file.name);
    } else {
      console.log(`⚠️ Nieobsługiwany typ pliku: ${file.type}`);
      content = `# ${file.name}\n\n**Typ pliku:** ${file.type}\n\n**Status:** Nieobsługiwany typ pliku. Obsługiwane są obecnie tylko pliki PDF.\n\n*Dodaj obsługę tego typu pliku lub przekonwertuj na PDF.*`;
    }

    console.log(`📝 Wynik ekstrakcji:`);
    console.log(`   - Długość content: ${content.length} znaków`);
    console.log(`   - Czy content ma wartość: ${!!content}`);
    console.log(`   - Początek content: "${content.substring(0, 100)}..."`);

    // 6. KRYTYCZNE: Sprawdź content przed zapisem
    if (!content || content.trim().length === 0) {
      console.log(`❌ KRYTYCZNY BŁĄD: content jest pusty!`);
      content = createFallbackText(file.name, 'EXTRACTION_ERROR', undefined, 'Ekstrakcja zwróciła pusty tekst');
    }

    // 7. Zapisz do bazy danych
    console.log(`💾 Zapisuję do bazy danych...`);
    
    const documentData = {
      title: title.trim(),
      description: '',
      fileName: `${uuidv4()}.${file.name.split('.').pop()}`,
      originalFileName: file.name,
      filePath: `base64:${base64}`,
      fileType: 'pdf',
      fileSize: file.size,
      content: content,
      categoryId,
      uploadedBy: session.user.email,
      uploadedByName: session.user.name || session.user.email,
    };

    console.log(`📋 Dane do zapisu:`);
    console.log(`   - title: "${documentData.title}"`);
    console.log(`   - fileName: "${documentData.fileName}"`);
    console.log(`   - originalFileName: "${documentData.originalFileName}"`);
    console.log(`   - fileType: "${documentData.fileType}"`);
    console.log(`   - fileSize: ${documentData.fileSize}`);
    console.log(`   - content length: ${documentData.content.length}`);
    console.log(`   - categoryId: "${documentData.categoryId}"`);
    console.log(`   - uploadedBy: "${documentData.uploadedBy}"`);

    const saved = await prisma.knowledgeDocument.create({
      data: documentData
    });

    console.log(`✅ Dokument zapisany pomyślnie:`);
    console.log(`   - ID: ${saved.id}`);
    console.log(`   - Zapisano content: ${!!saved.content} (${saved.content?.length || 0} znaków)`);

    // 8. WALIDACJA: Sprawdź czy rzeczywiście zapisało się z contentem
    const verification = await prisma.knowledgeDocument.findUnique({
      where: { id: saved.id },
      select: { 
        id: true, 
        title: true, 
        content: true 
      }
    });

    console.log(`🔍 Weryfikacja zapisu:`);
    console.log(`   - Znaleziono dokument: ${!!verification}`);
    console.log(`   - Ma content: ${!!verification?.content}`);
    console.log(`   - Długość content: ${verification?.content?.length || 0}`);

    if (!verification?.content) {
      console.log(`❌ KRYTYCZNY BŁĄD: Dokument zapisał się bez contentu!`);
      // Spróbuj naprawić
      await prisma.knowledgeDocument.update({
        where: { id: saved.id },
        data: { content: content }
      });
      console.log(`🔄 Ponownie zapisano content`);
    }

    console.log('🔥 === END upload endpoint SUCCESS ===');
    return NextResponse.json({ 
      success: true, 
      documentId: saved.id,
      debug: {
        contentLength: content.length,
        hasContent: !!content,
        verificationPassed: !!verification?.content,
        pdfParseFixed: pdfParseFixed
      }
    });

  } catch (err) {
    console.error('❌ === upload endpoint ERROR ===');
    console.error('❌ Szczegóły błędu:', {
      name: err instanceof Error ? err.name : 'UnknownError',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5) : 'No stack trace'
    });
    
    return NextResponse.json({ 
      error: 'Błąd serwera', 
      detail: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    
  } finally {
    await prisma.$disconnect();
    console.log('🔥 === END upload endpoint (finally) ===');
  }
}