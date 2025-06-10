// app/api/knowledge/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Zwiększ limit czasu dla Vercel
export const maxDuration = 60; // 60 sekund
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 Upload endpoint wywołany');

    // Sprawdź autoryzację
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      console.log('❌ Brak autoryzacji');
      return NextResponse.json(
        { error: 'Brak autoryzacji. Musisz być zalogowany.' },
        { status: 401 }
      );
    }

    console.log(`📁 Upload dokumentu przez użytkownika: ${session.user.email}`);

    let formData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error('❌ Błąd podczas parsowania formData:', error);
      return NextResponse.json(
        { error: 'Błąd podczas parsowania danych formularza' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const categoryId = formData.get('categoryId') as string;

    console.log(`📋 Dane formularza:`, {
      hasFile: !!file,
      title,
      description,
      categoryId,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
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

    // Sprawdź czy kategoria istnieje
    let category;
    try {
      category = await prisma.knowledgeCategory.findUnique({
        where: { id: categoryId }
      });
    } catch (error) {
      console.error('❌ Błąd podczas pobierania kategorii:', error);
      return NextResponse.json(
        { error: 'Błąd podczas weryfikacji kategorii' },
        { status: 500 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Wybrana kategoria nie istnieje' },
        { status: 400 }
      );
    }

    // Sprawdź dostęp do kategorii
    if (!category.isPublic && category.createdBy !== session.user.email) {
      return NextResponse.json(
        { error: 'Nie masz dostępu do tej kategorii' },
        { status: 403 }
      );
    }

    // Sprawdź typ pliku (uproszczone)
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

    // Sprawdź rozmiar pliku - ograniczenie dla Vercel (4.5MB zamiast 10MB)
    const maxSize = 4.5 * 1024 * 1024; // 4.5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Plik jest za duży. Maksymalny rozmiar to 4.5MB.' },
        { status: 400 }
      );
    }

    // Generuj unikalne nazwy plików
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const originalFileName = file.name;

    // WAŻNE: Na Vercel nie możemy zapisywać plików na dysku!
    // Zamiast tego konwertujemy plik na base64 i zapisujemy w bazie danych
    let fileBuffer;
    try {
      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
    } catch (error) {
      console.error('❌ Błąd podczas odczytu pliku:', error);
      return NextResponse.json(
        { error: 'Błąd podczas odczytu pliku' },
        { status: 400 }
      );
    }

    // Konwersja do base64 dla przechowywania w bazie danych
    const fileBase64 = fileBuffer.toString('base64');

    console.log(`💾 Plik przekonwertowany do base64, rozmiar: ${fileBase64.length} znaków`);

    // Uproszczona ekstrakcja tekstu
    let extractedText = `Dokument: ${originalFileName}`;
    let fileType = 'document';

    if (file.type === 'application/pdf') {
      fileType = 'pdf';
      extractedText = `PDF Document: ${originalFileName}`;
    } else if (file.type.includes('sheet') || file.type.includes('excel')) {
      fileType = 'excel';
      extractedText = `Excel Document: ${originalFileName}`;
    } else if (file.type === 'text/plain') {
      fileType = 'txt';
      try {
        extractedText = fileBuffer.toString('utf-8');
      } catch (error) {
        console.warn('Nie udało się odczytać tekstu z pliku TXT');
        extractedText = `Text Document: ${originalFileName}`;
      }
    } else if (file.type.includes('word')) {
      fileType = 'word';
      extractedText = `Word Document: ${originalFileName}`;
    }

    // Zapisz dokument w bazie danych
    let document;
    try {
      document = await prisma.knowledgeDocument.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          fileName: fileName,
          originalFileName: originalFileName,
          filePath: `base64:${fileBase64}`, // Przechowujemy base64 zamiast ścieżki
          fileType: fileType,
          fileSize: file.size,
          content: extractedText,
          categoryId: categoryId,
          uploadedBy: session.user.email,
          uploadedByName: session.user.name || session.user.email,
        },
        include: {
          category: true
        }
      });
    } catch (error) {
      console.error('❌ Błąd podczas zapisywania do bazy danych:', error);
      return NextResponse.json(
        { 
          error: 'Błąd podczas zapisywania dokumentu w bazie danych',
          details: error instanceof Error ? error.message : 'Nieznany błąd bazy danych'
        },
        { status: 500 }
      );
    }

    console.log(`✅ Dokument utworzony w bazie: ${document.id}`);

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
        createdAt: document.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Ogólny błąd podczas uploadu:', error);
    
    // Szczegółowe logowanie błędu
    if (error instanceof Error) {
      console.error('❌ Szczegóły błędu:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Wystąpił błąd podczas przesyłania dokumentu',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  } finally {
    // Zamknij połączenie z Prisma
    await prisma.$disconnect();
  }
}