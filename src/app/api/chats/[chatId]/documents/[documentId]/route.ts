// src/app/api/chats/[chatId]/documents/[documentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Pobieranie konkretnego dokumentu
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string, documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { chatId, documentId } = params;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
    }

    // Sprawdź, czy czat należy do zalogowanego użytkownika
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id
      }
    });

    if (!chat) {
      return NextResponse.json({ error: 'Czat nie znaleziony lub brak uprawnień' }, { status: 404 });
    }

    // Pobierz dokument
    const document = await prisma.document.findUnique({
      where: {
        id: documentId
      }
    });

    if (!document || document.chatId !== chatId) {
      return NextResponse.json({ error: 'Dokument nie znaleziony' }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Błąd podczas pobierania dokumentu:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Wystąpił problem podczas pobierania dokumentu'
    }, { status: 500 });
  }
}

// Aktualizacja dokumentu
export async function PUT(
  request: NextRequest,
  { params }: { params: { chatId: string, documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { chatId, documentId } = params;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
    }

    // Sprawdź, czy czat należy do zalogowanego użytkownika
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id
      }
    });

    if (!chat) {
      return NextResponse.json({ error: 'Czat nie znaleziony lub brak uprawnień' }, { status: 404 });
    }

    // Sprawdź czy dokument istnieje i należy do tego czatu
    const existingDocument = await prisma.document.findUnique({
      where: {
        id: documentId
      }
    });

    if (!existingDocument || existingDocument.chatId !== chatId) {
      return NextResponse.json({ error: 'Dokument nie znaleziony' }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ error: 'Błąd parsowania danych żądania' }, { status: 400 });
    }
    
    const { title, fileType, content, pages, rows, columns, metadata, isDefault } = body;

    // Sanityzacja zawartości
    let processedContent = existingDocument.content;
    if (content !== undefined) {
      try {
        // Sanityzacja treści
        const sanitizedContent = content
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
          .replace(/\uFFFD/g, '');
        
        // Ogranicz rozmiar dla dużych dokumentów
        const contentSize = Buffer.byteLength(sanitizedContent, 'utf8');
        if (contentSize > 500000) {
          processedContent = sanitizedContent.substring(0, 450000) + "... [treść skrócona ze względu na rozmiar]";
        } else {
          processedContent = sanitizedContent;
        }
      } catch (error) {
        console.error("Błąd podczas przetwarzania treści:", error);
        const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
        processedContent = `[Błąd przetwarzania treści: ${errorMessage}]`;
      }
    }

    // Jeśli ustawiamy ten dokument jako domyślny, dezaktywuj poprzedni domyślny
    if (isDefault && !existingDocument.isDefault) {
      const currentDefault = await prisma.document.findFirst({
        where: {
          chatId: chatId,
          isDefault: true,
          id: { not: documentId }
        }
      });

      if (currentDefault) {
        await prisma.document.update({
          where: { id: currentDefault.id },
          data: { isDefault: false }
        });
      }
    }

    // Aktualizuj dokument
    const updatedDocument = await prisma.document.update({
      where: {
        id: documentId
      },
      data: {
        title: title !== undefined ? title : existingDocument.title,
        fileType: fileType !== undefined ? fileType : existingDocument.fileType,
        content: processedContent,
        pages: pages !== undefined ? (pages !== null ? Number(pages) : null) : existingDocument.pages,
        rows: rows !== undefined ? (rows !== null ? Number(rows) : null) : existingDocument.rows,
        columns: columns !== undefined ? (columns !== null ? Number(columns) : null) : existingDocument.columns,
        metadata: metadata !== undefined ? metadata : existingDocument.metadata,
        isDefault: isDefault !== undefined ? isDefault : existingDocument.isDefault
      }
    });

    // Zwróć dokument bez pełnej treści
    const documentWithoutContent = {
      ...updatedDocument,
      content: updatedDocument.content ? `[Treść dokumentu, ${Buffer.byteLength(updatedDocument.content, 'utf8') / 1024} KB]` : null
    };

    return NextResponse.json({ document: documentWithoutContent });
  } catch (error) {
    console.error('Błąd podczas aktualizacji dokumentu:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Wystąpił problem podczas aktualizacji dokumentu'
    }, { status: 500 });
  }
}

// Usuwanie dokumentu - kontynuacja
export async function DELETE(
    request: NextRequest,
    { params }: { params: { chatId: string, documentId: string } }
  ) {
    try {
      const session = await getServerSession(authOptions);
      const { chatId, documentId } = params;
      
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
      }
  
      // Sprawdź, czy czat należy do zalogowanego użytkownika
      const chat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          userId: session.user.id
        }
      });
  
      if (!chat) {
        return NextResponse.json({ error: 'Czat nie znaleziony lub brak uprawnień' }, { status: 404 });
      }
  
      // Sprawdź czy dokument istnieje i należy do tego czatu
      const document = await prisma.document.findUnique({
        where: {
          id: documentId
        }
      });
  
      if (!document || document.chatId !== chatId) {
        return NextResponse.json({ error: 'Dokument nie znaleziony' }, { status: 404 });
      }
  
      // Usuń dokument
      await prisma.document.delete({
        where: {
          id: documentId
        }
      });
  
      // Usuń dokument z listy aktywnych dokumentów
      if (chat.activeDocuments && chat.activeDocuments.includes(documentId)) {
        await prisma.chat.update({
          where: { id: chatId },
          data: {
            activeDocuments: {
              set: chat.activeDocuments.filter(id => id !== documentId)
            }
          }
        });
      }
  
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Błąd podczas usuwania dokumentu:', error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Wystąpił problem podczas usuwania dokumentu'
      }, { status: 500 });
    }
  }