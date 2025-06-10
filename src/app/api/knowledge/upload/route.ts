// app/api/knowledge/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

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

    const formData = await request.formData();
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
    const category = await prisma.knowledgeCategory.findUnique({
      where: { id: categoryId }
    });

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

    // Sprawdź rozmiar pliku (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Plik jest za duży. Maksymalny rozmiar to 10MB.' },
        { status: 400 }
      );
    }

    // Generuj unikalne nazwy plików
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const originalFileName = file.name;

    // Utwórz folder uploads jeśli nie istnieje
    const uploadsDir = join(process.cwd(), 'uploads', 'knowledge');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      console.warn('Folder uploads już istnieje');
    }

    // Zapisz plik na dysku
    const filePath = join(uploadsDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    console.log(`💾 Zapisano plik: ${filePath}`);

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
        extractedText = buffer.toString('utf-8');
      } catch (error) {
        extractedText = `Text Document: ${originalFileName}`;
      }
    }

    // Zapisz dokument w bazie danych
    const document = await prisma.knowledgeDocument.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        fileName: fileName,
        originalFileName: originalFileName,
        filePath: filePath,
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
    console.error('❌ Błąd podczas uploadu dokumentu:', error);
    
    return NextResponse.json(
      { 
        error: 'Wystąpił błąd podczas przesyłania dokumentu',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  }
}