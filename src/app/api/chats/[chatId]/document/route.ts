// src/app/api/chats/[chatId]/document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { Document } from '@prisma/client';  // Importujemy typ Document z Prisma

export const dynamic = 'force-dynamic';

// Zapisywanie dokumentu (PDF lub Excel)
export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions);
  const chatId = params.chatId;
  
  console.log("Zapisywanie dokumentu dla czatu:", chatId);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
  }

  if (!chatId) {
    console.error("Brak ID czatu w parametrach");
    return NextResponse.json({ error: 'Nieprawidłowe ID czatu' }, { status: 400 });
  }

  try {
    console.log("Sesja użytkownika:", session.user.id);
    
    // Sprawdź, czy czat należy do zalogowanego użytkownika
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id
      }
    });

    console.log("Znaleziony czat:", chat ? "Tak" : "Nie");

    if (!chat) {
      console.error(`Czat o ID ${chatId} nie znaleziony lub brak uprawnień`);
      return NextResponse.json({ error: 'Czat nie znaleziony lub brak uprawnień' }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Błąd parsowania JSON:", parseError);
      return NextResponse.json({ error: 'Błąd parsowania danych żądania' }, { status: 400 });
    }
    
    const { title, fileType, content, pages, rows, columns, metadata } = body;

    console.log("Request body:", { 
      title, 
      fileType, 
      contentLength: content ? content.length : 0,
      pages, 
      rows, 
      columns 
    });
    
    if (!title || !fileType) {
      return NextResponse.json({ error: 'Brak wymaganych danych dokumentu' }, { status: 400 });
    }

    // Sanityzacja zawartości
    let sanitizedContent = "";
    let processedContent = "";
    
    try {
      // Zabezpieczenie przed problemami z treścią
      if (content) {
        // Próba sanityzacji treści - usunięcie potencjalnie problematycznych znaków
        sanitizedContent = content
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Kontrolne znaki ASCII
          .replace(/\uFFFD/g, ''); // Znak zastępczy Unicode
        
        // Sprawdź rozmiar treści
        const contentSize = Buffer.byteLength(sanitizedContent, 'utf8');
        console.log(`Rozmiar dokumentu ${title} po sanityzacji: ${contentSize / 1024} KB`);
        
        // Ogranicz rozmiar treści dla dużych dokumentów
        if (contentSize > 500000) { // 500KB limit
          console.log("Dokument przekracza limit rozmiaru, treść zostanie skrócona");
          processedContent = sanitizedContent.substring(0, 450000) + "... [treść skrócona ze względu na rozmiar]";
        } else {
          processedContent = sanitizedContent;
        }
      }
    } catch (error) {
      console.error("Błąd podczas przetwarzania treści:", error);
      // Sprawdź typ błędu i bezpiecznie wyodrębnij wiadomość
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
      // Zapisz informację o błędzie, ale kontynuuj z pustą treścią
      processedContent = `[Błąd przetwarzania treści: ${errorMessage}]`;
    }
    
    // Przygotuj dane dokumentu
    const documentData = {
      title: title || 'Dokument bez tytułu',
      fileType: fileType || 'unknown',
      content: processedContent || '',
      pages: pages !== undefined && pages !== null ? Number(pages) : null,
      rows: rows !== undefined && rows !== null ? Number(rows) : null,
      columns: columns !== undefined && columns !== null ? Number(columns) : null,
      metadata: metadata || {},
      chatId: chatId,
    };
    
    console.log("Dane dokumentu do zapisania:", {
      ...documentData,
      content: `[Treść ${documentData.content.length} znaków]`
    });

    // Zamiast aktualizować istniejący dokument, zawsze tworzymy nowy
    const document = await prisma.document.create({
      data: documentData
    });
    
    console.log("Nowy dokument utworzony pomyślnie, ID:", document.id);
    
    // Zaktualizuj listę aktywnych dokumentów
    const activeDocuments = chat.activeDocuments || [];
    if (!activeDocuments.includes(document.id)) {
      await prisma.chat.update({
        where: { id: chatId },
        data: {
          activeDocuments: [...activeDocuments, document.id]
        }
      });
      console.log("Dokument dodany do listy aktywnych dokumentów czatu");
    }

    // Zwróć dokument bez pełnej treści, aby zmniejszyć rozmiar odpowiedzi
    const documentWithoutContent = {
      ...document,
      content: document.content ? `[Treść dokumentu, ${Buffer.byteLength(document.content, 'utf8') / 1024} KB]` : null
    };

    return NextResponse.json({ document: documentWithoutContent });
  } catch (error) {
    console.error('Błąd podczas zapisywania dokumentu:', error);
    
    // Dodaj szczegółowe logowanie
    if (error instanceof Error) {
      console.error('Nazwa błędu:', error.name);
      console.error('Wiadomość błędu:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Wystąpił problem podczas zapisywania dokumentu'
    }, { status: 500 });
  }
}

// Pobieranie wszystkich aktywnych dokumentów
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions);
  const chatId = params.chatId;
  
  console.log("Pobieranie dokumentów dla czatu:", chatId);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
  }

  if (!chatId) {
    console.error("Brak ID czatu w parametrach");
    return NextResponse.json({ error: 'Nieprawidłowe ID czatu' }, { status: 400 });
  }

  try {
    // Sprawdź, czy czat należy do zalogowanego użytkownika
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id
      }
    });

    if (!chat) {
      console.error(`Czat o ID ${chatId} nie znaleziony lub brak uprawnień`);
      return NextResponse.json({ error: 'Czat nie znaleziony lub brak uprawnień' }, { status: 404 });
    }

    // Pobierz dokumenty na podstawie listy aktywnych dokumentów
    let documents: Document[] = []; // Tutaj dodajemy typ Document[]
    
    if (chat.activeDocuments && chat.activeDocuments.length > 0) {
      documents = await prisma.document.findMany({
        where: {
          id: {
            in: chat.activeDocuments
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    // Jeśli nie ma dokumentów w activeDocuments, spróbuj znaleźć starsze dokumenty
    if (documents.length === 0) {
      documents = await prisma.document.findMany({
        where: {
          chatId: chatId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // Jeśli znaleziono stare dokumenty, zaktualizuj activeDocuments
      if (documents.length > 0) {
        const documentIds = documents.map(doc => doc.id);
        
        await prisma.chat.update({
          where: { id: chatId },
          data: {
            activeDocuments: documentIds
          }
        });
        
        console.log("Zaktualizowano listę aktywnych dokumentów na podstawie znalezionych dokumentów");
      }
    }

    // Przygotuj odpowiedź bez pełnych treści
    const documentsWithoutContent = documents.map(doc => ({
      ...doc,
      content: doc.content ? `[Treść dokumentu, ${Buffer.byteLength(doc.content, 'utf8') / 1024} KB]` : null
    }));

    return NextResponse.json({ documents: documentsWithoutContent });
  } catch (error) {
    console.error('Błąd podczas pobierania dokumentów:', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas pobierania dokumentów' }, { status: 500 });
  }
}

// Usuwanie wszystkich dokumentów czatu lub konkretnego dokumentu
export async function DELETE(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions);
  const chatId = params.chatId;
  
  console.log("Usuwanie dokumentu(ów) dla czatu:", chatId);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
  }

  if (!chatId) {
    console.error("Brak ID czatu w parametrach");
    return NextResponse.json({ error: 'Nieprawidłowe ID czatu' }, { status: 400 });
  }

  try {
    // Sprawdź, czy czat należy do zalogowanego użytkownika
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id
      }
    });

    if (!chat) {
      console.error(`Czat o ID ${chatId} nie znaleziony lub brak uprawnień`);
      return NextResponse.json({ error: 'Czat nie znaleziony lub brak uprawnień' }, { status: 404 });
    }

    // Sprawdź, czy żądanie zawiera ID konkretnego dokumentu
    const url = new URL(request.url);
    const documentId = url.searchParams.get('documentId');

    if (documentId) {
      // Usuń konkretny dokument
      await prisma.document.delete({
        where: {
          id: documentId
        }
      });
      
      // Aktualizuj listę aktywnych dokumentów
      if (chat.activeDocuments && chat.activeDocuments.includes(documentId)) {
        await prisma.chat.update({
          where: { id: chatId },
          data: {
            activeDocuments: chat.activeDocuments.filter(id => id !== documentId)
          }
        });
      }
      
      console.log(`Dokument o ID ${documentId} został usunięty`);
    } else {
      // Usuń wszystkie dokumenty dla tego czatu
      await prisma.document.deleteMany({
        where: {
          chatId: chatId
        }
      });
      
      // Wyczyść listę aktywnych dokumentów
      await prisma.chat.update({
        where: { id: chatId },
        data: {
          activeDocuments: []
        }
      });
      
      console.log(`Wszystkie dokumenty dla czatu ${chatId} zostały usunięte`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Błąd podczas usuwania dokumentu(ów):', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas usuwania dokumentu(ów)' }, { status: 500 });
  }
}