// app/api/knowledge/upload/route.ts - OSTATECZNA NAPRAWIONA WERSJA
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export const maxDuration = 60;
export const runtime = 'nodejs';

// ✅ KLUCZOWA ZMIANA: Funkcje zawsze zwracają użyteczną zawartość
function createFallbackText(
  fileName: string, 
  reason: string, 
  pages?: number, 
  error?: any
): string {
  console.log(`📝 Tworzę fallback text dla: ${fileName}, powód: ${reason}`);
  
  let fallbackText = `# Dokument: ${fileName}\n\n`;
  
  switch (reason) {
    case 'EMPTY_BUFFER':
      fallbackText += `**Status:** Błąd odczytu pliku\n\n`;
      fallbackText += `Plik wydaje się być pusty lub uszkodzony podczas przesyłania.\n\n`;
      break;
      
    case 'INVALID_HEADER':
      fallbackText += `**Status:** Nieprawidłowy format pliku\n\n`;
      fallbackText += `Plik nie ma prawidłowego nagłówka PDF.\n\n`;
      break;
      
    case 'NO_TEXT_EXTRACTED':
      fallbackText += `**Status:** PDF skanowany (obrazkowy)\n\n`;
      if (pages) {
        fallbackText += `**Liczba stron:** ${pages}\n\n`;
      }
      fallbackText += `Dokument został pomyślnie przesłany, ale nie zawiera tekstu do automatycznej analizy.\n\n`;
      fallbackText += `**Możliwe przyczyny:**\n`;
      fallbackText += `- Dokument jest skanowany (zawiera tekst jako obrazy)\n`;
      fallbackText += `- Dokument jest chroniony zabezpieczeniami\n`;
      fallbackText += `- Tekst jest w nieczytelnym formacie\n\n`;
      break;
      
    case 'EXTRACTION_ERROR':
      fallbackText += `**Status:** Błąd podczas przetwarzania\n\n`;
      fallbackText += `Wystąpił błąd techniczny podczas ekstraktowania tekstu:\n`;
      fallbackText += `\`${error instanceof Error ? error.message : String(error)}\`\n\n`;
      break;
      
    case 'PDF_PARSE_MISSING':
      fallbackText += `**Status:** Brak biblioteki pdf-parse\n\n`;
      fallbackText += `Biblioteka do odczytu PDF nie jest dostępna na serwerze.\n\n`;
      break;
  }
  
  fallbackText += `**Instrukcje:**\n`;
  fallbackText += `- Aby uzyskać pomoc z tym dokumentem, opisz jego zawartość w zapytaniu\n`;
  fallbackText += `- Możesz zadawać pytania odnoszące się do tytułu i typu dokumentu\n`;
  fallbackText += `- Jeśli to możliwe, przekonwertuj dokument na format tekstowy przed przesłaniem\n\n`;
  
  fallbackText += `*Dokument został zapisany i jest dostępny do pobrania, ale wymaga ręcznego opisu zawartości.*`;
  
  return fallbackText;
}

// ✅ NAPRAWIONA funkcja PDF - zawsze zwraca użyteczną zawartość
async function extractTextFromPDF(buffer: Buffer, fileName: string): Promise<string> {
  console.log(`🔍 === EKSTRAKTOWANIE PDF: ${fileName} ===`);
  console.log(`📊 Rozmiar bufora: ${buffer.length} bajtów`);
  
  // Sprawdź podstawowe warunki
  if (!buffer || buffer.length === 0) {
    console.error('❌ Bufor PDF jest pusty');
    return createFallbackText(fileName, 'EMPTY_BUFFER');
  }
  
  // Sprawdź nagłówek PDF
  const pdfHeader = buffer.slice(0, 4).toString('ascii');
  console.log(`🔍 Header pliku: "${pdfHeader}"`);
  
  if (!pdfHeader.startsWith('%PDF')) {
    console.error('❌ Nieprawidłowy nagłówek PDF:', pdfHeader);
    return createFallbackText(fileName, 'INVALID_HEADER');
  }
  
  console.log('✅ Plik ma prawidłowy nagłówek PDF');
  
  try {
    // Próba importu pdf-parse
    console.log('🔍 Próba importu pdf-parse...');
    const pdfParse = (await import('pdf-parse')).default;
    console.log('✅ pdf-parse zaimportowany pomyślnie');
    
    // Ekstraktowanie z timeoutem
    console.log('🔍 Rozpoczynam ekstraktowanie tekstu...');
    const extractionPromise = pdfParse(buffer, {
      max: 0, // nie limituj stron
      version: 'default'
    });
    
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout podczas ekstraktowania (20s)')), 20000)
    );
    
    const pdfData = await Promise.race([extractionPromise, timeoutPromise]) as any;
    
    console.log('✅ Ekstraktowanie zakończone:', {
      pages: pdfData.numpages,
      textLength: pdfData.text?.length || 0,
      hasText: !!pdfData.text
    });
    
    // ✅ KLUCZOWA ZMIANA: zawsze zwróć jakąś zawartość
    if (pdfData.text && pdfData.text.trim().length > 0) {
      const cleanText = pdfData.text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      console.log(`✅ Zwracam oczyszczony tekst: ${cleanText.length} znaków`);
      
      // Dodaj header z metadanymi
      return `# PDF: ${fileName}\n\n**Liczba stron:** ${pdfData.numpages}\n**Rozmiar tekstu:** ${cleanText.length} znaków\n\n**Zawartość:**\n\n${cleanText}`;
    } else {
      console.warn('⚠️ PDF przetworzony, ale bez tekstu - używam fallback');
      return createFallbackText(fileName, 'NO_TEXT_EXTRACTED', pdfData.numpages);
    }
    
  } catch (error) {
    console.error('❌ Błąd ekstraktowania PDF:', error);
    
    if (error instanceof Error && error.message.includes('Cannot resolve module')) {
      return createFallbackText(fileName, 'PDF_PARSE_MISSING', undefined, error);
    }
    
    return createFallbackText(fileName, 'EXTRACTION_ERROR', undefined, error);
  }
}

// ✅ NAPRAWIONA funkcja Excel
async function extractTextFromExcel(buffer: Buffer, fileName: string): Promise<string> {
  console.log(`🔍 === EKSTRAKTOWANIE EXCEL: ${fileName} ===`);
  
  try {
    const XLSX = (await import('xlsx')).default;
    console.log('✅ XLSX zaimportowany pomyślnie');
    
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log(`📊 Workbook wczytany, arkusze: ${workbook.SheetNames.length}`);
    
    if (workbook.SheetNames.length === 0) {
      return createExcelFallbackText(fileName, 'NO_SHEETS');
    }
    
    let extractedText = `# Arkusz Excel: ${fileName}\n\n`;
    extractedText += `**Liczba arkuszy:** ${workbook.SheetNames.length}\n\n`;
    
    let totalCells = 0;
    
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`📄 Przetwarzam arkusz ${index + 1}: "${sheetName}"`);
      
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      const cellCount = (csv.match(/\n/g) || []).length + 1;
      totalCells += cellCount;
      
      extractedText += `## Arkusz: ${sheetName}\n\n`;
      if (csv.trim().length > 0) {
        extractedText += `\`\`\`csv\n${csv}\n\`\`\`\n\n`;
      } else {
        extractedText += `*Arkusz jest pusty*\n\n`;
      }
      
      console.log(`✅ Arkusz "${sheetName}" przetworzony: ${cellCount} wierszy`);
    });
    
    extractedText += `**Podsumowanie:** ${totalCells} wierszy danych w ${workbook.SheetNames.length} arkuszach\n`;
    
    console.log(`✅ Excel ekstraktowanie zakończone: ${extractedText.length} znaków`);
    return extractedText;
    
  } catch (error) {
    console.error('❌ Błąd ekstraktowania Excel:', error);
    return createExcelFallbackText(fileName, 'EXTRACTION_ERROR', error);
  }
}

function createExcelFallbackText(fileName: string, reason: string, error?: any): string {
  let fallbackText = `# Arkusz Excel: ${fileName}\n\n`;
  fallbackText += `**Status:** Błąd przetwarzania\n\n`;
  
  if (reason === 'NO_SHEETS') {
    fallbackText += `Plik nie zawiera arkuszy do przetworzenia.\n\n`;
  } else if (reason === 'EXTRACTION_ERROR') {
    fallbackText += `Wystąpił błąd podczas odczytu pliku Excel:\n`;
    fallbackText += `\`${error instanceof Error ? error.message : String(error)}\`\n\n`;
  }
  
  fallbackText += `Plik został zapisany i można go pobrać, ale wymaga ręcznego opisu zawartości.`;
  return fallbackText;
}

// ✅ NAPRAWIONA funkcja Word
async function extractTextFromWord(buffer: Buffer, fileName: string): Promise<string> {
  console.log(`🔍 === EKSTRAKTOWANIE WORD: ${fileName} ===`);
  
  try {
    const mammoth = (await import('mammoth')).default;
    console.log('✅ Mammoth zaimportowany pomyślnie');
    
    const result = await mammoth.extractRawText({ buffer });
    
    if (result.value && result.value.trim().length > 0) {
      console.log(`✅ Word ekstraktowanie zakończone: ${result.value.length} znaków`);
      return `# Dokument Word: ${fileName}\n\n**Rozmiar tekstu:** ${result.value.length} znaków\n\n**Zawartość:**\n\n${result.value}`;
    } else {
      console.warn('⚠️ Word przetworzony, ale bez tekstu');
      return createWordFallbackText(fileName, 'NO_TEXT');
    }
    
  } catch (error) {
    console.error('❌ Błąd ekstraktowania Word:', error);
    return createWordFallbackText(fileName, 'EXTRACTION_ERROR', error);
  }
}

function createWordFallbackText(fileName: string, reason: string, error?: any): string {
  let fallbackText = `# Dokument Word: ${fileName}\n\n`;
  fallbackText += `**Status:** Problem z przetwarzaniem\n\n`;
  
  if (reason === 'NO_TEXT') {
    fallbackText += `Dokument został odczytany, ale nie zawiera tekstu do analizy.\n\n`;
  } else {
    fallbackText += `Wystąpił błąd podczas odczytu dokumentu:\n`;
    fallbackText += `\`${error instanceof Error ? error.message : String(error)}\`\n\n`;
  }
  
  fallbackText += `Dokument został zapisany i można go pobrać.`;
  return fallbackText;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 === UPLOAD ENDPOINT START ===');

    // Sprawdź autoryzację
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      console.log('❌ Brak autoryzacji');
      return NextResponse.json(
        { error: 'Brak autoryzacji. Musisz być zalogowany.' },
        { status: 401 }
      );
    }

    console.log(`👤 Upload przez użytkownika: ${session.user.email}`);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const categoryId = formData.get('categoryId') as string;

    console.log(`📋 Dane formularza:`, {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      title,
      categoryId
    });

    // Walidacja danych
    if (!file) {
      return NextResponse.json(
        { error: 'Brak pliku do przesłania' },
        { status: 400 }
      );
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Tytuł dokumentu jest wymagany' },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Kategoria jest wymagana' },
        { status: 400 }
      );
    }

    // Sprawdź kategorię
    const category = await prisma.knowledgeCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Wybrana kategoria nie istnieje' },
        { status: 400 }
      );
    }

    if (!category.isPublic && category.createdBy !== session.user.email) {
      return NextResponse.json(
        { error: 'Nie masz dostępu do tej kategorii' },
        { status: 403 }
      );
    }

    // Walidacja typu pliku
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Nieprawidłowy typ pliku. Dozwolone są: PDF, Excel, Word, TXT' },
        { status: 400 }
      );
    }

    const maxSize = 4.5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Plik jest za duży. Maksymalny rozmiar to 4.5MB.' },
        { status: 400 }
      );
    }

    // Konwertuj plik
    const bytes = await file.arrayBuffer();
    const fileBuffer = Buffer.from(bytes);
    const fileBase64 = fileBuffer.toString('base64');

    console.log(`💾 Plik wczytany: ${fileBuffer.length} bajtów, base64: ${fileBase64.length} znaków`);

    // ✅ NAPRAWIONA EKSTRAKCJA TEKSTU - zawsze zwraca użyteczny tekst
    let extractedText = '';
    let fileType = 'document';
    let extractionStatus = 'UNKNOWN';

    console.log('📄 === ROZPOCZYNAM EKSTRAKTOWANIE TEKSTU ===');

    try {
      if (file.type === 'application/pdf') {
        fileType = 'pdf';
        console.log('🔍 Wykryto PDF, rozpoczynam ekstraktowanie...');
        extractedText = await extractTextFromPDF(fileBuffer, file.name);
        extractionStatus = extractedText.includes('Status: PDF skanowany') ? 'SCANNED_PDF' : 
                          extractedText.includes('Status:') ? 'FALLBACK_USED' : 'SUCCESS';
        
      } else if (file.type.includes('sheet') || file.type.includes('excel')) {
        fileType = 'excel';
        console.log('🔍 Wykryto Excel, rozpoczynam ekstraktowanie...');
        extractedText = await extractTextFromExcel(fileBuffer, file.name);
        extractionStatus = extractedText.includes('Status:') ? 'FALLBACK_USED' : 'SUCCESS';
        
      } else if (file.type === 'text/plain') {
        fileType = 'txt';
        console.log('🔍 Wykryto TXT, odczytuję zawartość...');
        const textContent = fileBuffer.toString('utf-8');
        extractedText = `# Plik tekstowy: ${file.name}\n\n**Rozmiar:** ${textContent.length} znaków\n\n**Zawartość:**\n\n${textContent}`;
        extractionStatus = 'SUCCESS';
        
      } else if (file.type.includes('word')) {
        fileType = 'word';
        console.log('🔍 Wykryto Word, rozpoczynam ekstraktowanie...');
        extractedText = await extractTextFromWord(fileBuffer, file.name);
        extractionStatus = extractedText.includes('Status:') ? 'FALLBACK_USED' : 'SUCCESS';
      }

      // ✅ GWARANCJA: zawsze mamy jakiś tekst
      if (!extractedText || extractedText.trim().length === 0) {
        console.error('❌ KRYTYCZNY BŁĄD: Próba zapisu pustej zawartości!');
        extractedText = createFallbackText(file.name, 'FINAL_FALLBACK');
        extractionStatus = 'FINAL_FALLBACK';
      }
      
    } catch (extractError) {
      console.error('❌ KRYTYCZNY BŁĄD EKSTRAKTOWANIA:', extractError);
      extractedText = createFallbackText(file.name, 'EXTRACTION_ERROR', undefined, extractError);
      extractionStatus = 'CRITICAL_ERROR';
    }

    console.log('📄 === EKSTRAKTOWANIE ZAKOŃCZONE ===');
    console.log(`📊 Status: ${extractionStatus}`);
    console.log(`📊 Długość tekstu: ${extractedText.length} znaków`);
    console.log(`📖 Początek tekstu: "${extractedText.substring(0, 200)}..."`);

    // ✅ GWARANCJA: nie zapisujemy NIGDY pustej zawartości
    if (!extractedText || extractedText.trim().length < 10) {
      console.error('❌ KRYTYCZNY BŁĄD: Próba zapisu pustej zawartości!');
      extractedText = createFallbackText(file.name, 'FINAL_FALLBACK');
      extractionStatus = 'FINAL_FALLBACK';
    }

    // Generuj nazwy plików
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;

    // Zapisz dokument w bazie danych
    const document = await prisma.knowledgeDocument.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        fileName: fileName,
        originalFileName: file.name,
        filePath: `base64:${fileBase64}`,
        fileType: fileType,
        fileSize: file.size,
        content: extractedText, // ✅ Zawsze niepusta zawartość
        categoryId: categoryId,
        uploadedBy: session.user.email,
        uploadedByName: session.user.name || session.user.email,
      },
      include: {
        category: true
      }
    });

    console.log(`✅ === UPLOAD ZAKOŃCZONY POMYŚLNIE ===`);
    console.log(`✅ Dokument ID: ${document.id}`);
    console.log(`✅ Status ekstraktowania: ${extractionStatus}`);
    console.log(`✅ Długość zawartości: ${extractedText.length} znaków`);

    return NextResponse.json({
      success: true,
      message: 'Dokument został pomyślnie dodany do biblioteki wiedzy',
      document: {
        id: document.id,
        title: document.title,
        description: document.description,
        fileType: document.fileType,
        fileSize: document.fileSize,
        categoryName: document.category.name,
        uploadedBy: document.uploadedByName,
        createdAt: document.createdAt,
        contentLength: extractedText.length,
        extractionStatus: extractionStatus
      }
    });

  } catch (error) {
    console.error('❌ === OGÓLNY BŁĄD UPLOADU ===', error);
    
    return NextResponse.json(
      { 
        error: 'Wystąpił błąd podczas przesyłania dokumentu',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
    console.log('🔥 === UPLOAD ENDPOINT END ===');
  }
}