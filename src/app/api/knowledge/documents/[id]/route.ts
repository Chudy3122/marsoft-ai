// app/api/knowledge/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { unlink } from 'fs/promises';

const prisma = new PrismaClient();

// Usuwanie dokumentu
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sprawdź autoryzację
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      );
    }

    const documentId = params.id;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Brak ID dokumentu' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Próba usunięcia dokumentu ${documentId} przez ${session.user.email}`);

    // Znajdź dokument
    const document = await prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
      include: {
        category: true
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Dokument nie został znaleziony' },
        { status: 404 }
      );
    }

    // Sprawdź czy użytkownik jest właścicielem dokumentu lub kategorii
    const isDocumentOwner = document.uploadedBy === session.user.email;
    const isCategoryOwner = document.category.createdBy === session.user.email;

    if (!isDocumentOwner && !isCategoryOwner) {
      return NextResponse.json(
        { error: 'Nie masz uprawnień do usunięcia tego dokumentu' },
        { status: 403 }
      );
    }

    // Usuń plik z dysku tylko jeśli filePath to fizyczna ścieżka
    if (document.filePath && !document.filePath.startsWith('base64:')) {
      try {
        await unlink(document.filePath);
        console.log(`💾 Usunięto plik z dysku: ${document.filePath}`);
      } catch (fileError) {
        console.warn('Nie udało się usunąć pliku z dysku:', fileError);
      }
    } else {
      console.log('🧠 Pominięto usuwanie pliku — dokument trzymany w base64');
    }

    // Usuń dokument z bazy danych
    await prisma.knowledgeDocument.delete({
      where: { id: documentId }
    });

    console.log(`✅ Dokument ${documentId} został usunięty`);

    return NextResponse.json({
      success: true,
      message: 'Dokument został pomyślnie usunięty'
    });

  } catch (error) {
    console.error('❌ Błąd podczas usywania dokumentu:', error);
    return NextResponse.json(
      { 
        error: 'Wystąpił błąd podczas usywania dokumentu',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  }
}

// Pobieranie szczegółów dokumentu
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sprawdź autoryzację
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      );
    }

    const documentId = params.id;

    const document = await prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
      include: {
        category: true
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Dokument nie został znaleziony' },
        { status: 404 }
      );
    }

    // Sprawdź dostęp do dokumentu (przez kategorię)
    if (!document.category.isPublic && document.category.createdBy !== session.user.email) {
      return NextResponse.json(
        { error: 'Nie masz dostępu do tego dokumentu' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        description: document.description,
        fileType: document.fileType,
        fileSize: document.fileSize,
        originalFileName: document.originalFileName,
        uploadedBy: document.uploadedByName || document.uploadedBy,
        uploadedByEmail: document.uploadedBy,
        categoryId: document.categoryId,
        categoryName: document.category.name,
        isOwner: document.uploadedBy === session.user.email,
        isCategoryOwner: document.category.createdBy === session.user.email,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Błąd podczas pobierania dokumentu:', error);
    return NextResponse.json(
      { 
        error: 'Wystąpił błąd podczas pobierania dokumentu',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  }
}