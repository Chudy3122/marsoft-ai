// src/app/api/chats/[chatId]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { Document } from '@prisma/client'; // Importujemy typ Document z Prisma

export const dynamic = 'force-dynamic';

// Pobieranie dokumentów przypisanych do czatu
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const chatId = params.chatId;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
    }
    
    if (!chatId) {
      return NextResponse.json({ error: 'Nieprawidłowe ID czatu' }, { status: 400 });
    }
    
    console.log(`Pobieranie dokumentów dla czatu: ${chatId}`);
    
    // Sprawdź, czy czat należy do zalogowanego użytkownika
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id
      },
      select: {
        id: true,
        activeDocuments: true
      }
    });
    
    if (!chat) {
      return NextResponse.json({ error: 'Czat nie znaleziony lub brak uprawnień' }, { status: 404 });
    }
    
    console.log(`Znaleziono ${chat.activeDocuments ? chat.activeDocuments.length : 0} aktywnych dokumentów dla czatu`);
    
    return NextResponse.json({ documentIds: chat.activeDocuments || [] });
  } catch (error) {
    console.error('Błąd podczas pobierania dokumentów czatu:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas pobierania dokumentów czatu',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Aktualizacja dokumentów przypisanych do czatu
export async function PUT(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const chatId = params.chatId;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
    }
    
    if (!chatId) {
      return NextResponse.json({ error: 'Nieprawidłowe ID czatu' }, { status: 400 });
    }
    
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Błąd parsowania JSON:", parseError);
      return NextResponse.json({ error: 'Błąd parsowania danych żądania' }, { status: 400 });
    }
    
    const { documentIds } = body;
    
    if (!Array.isArray(documentIds)) {
      return NextResponse.json({ error: 'Nieprawidłowy format danych - documentIds musi być tablicą' }, { status: 400 });
    }
    
    console.log(`Aktualizacja dokumentów dla czatu ${chatId}: ${documentIds.join(', ')}`);
    
    // Sprawdź, czy czat należy do zalogowanego użytkownika
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id
      },
      select: {
        id: true
      }
    });
    
    if (!chat) {
      return NextResponse.json({ error: 'Czat nie znaleziony lub brak uprawnień' }, { status: 404 });
    }
    
    // Zaktualizuj listę dokumentów czatu
    try {
      const updatedChat = await prisma.chat.update({
        where: {
          id: chatId
        },
        data: {
          activeDocuments: documentIds
        }
      });
      
      console.log(`Zaktualizowano dokumenty dla czatu. Nowa ilość: ${documentIds.length}`);
      
      return NextResponse.json({ success: true, documentIds });
    } catch (dbError) {
      console.error('Błąd podczas aktualizacji dokumentów czatu w bazie danych:', dbError);
      
      // Szczegółowe logowanie błędu Prisma
      if (dbError instanceof Error) {
        console.error('Nazwa błędu:', dbError.name);
        console.error('Wiadomość błędu:', dbError.message);
        console.error('Stack trace:', dbError.stack);
      }
      
      return NextResponse.json({ 
        error: 'Wystąpił problem podczas aktualizacji dokumentów czatu',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Błąd podczas aktualizacji dokumentów czatu:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas aktualizacji dokumentów czatu',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Dodajemy obsługę metody POST do aktywacji dokumentu
export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const chatId = params.chatId;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
    }
    
    if (!chatId) {
      return NextResponse.json({ error: 'Nieprawidłowe ID czatu' }, { status: 400 });
    }
    
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Błąd parsowania JSON:", parseError);
      return NextResponse.json({ error: 'Błąd parsowania danych żądania' }, { status: 400 });
    }
    
    const { documentIds } = body;
    
    if (!Array.isArray(documentIds)) {
      return NextResponse.json({ error: 'Nieprawidłowy format danych - documentIds musi być tablicą' }, { status: 400 });
    }
    
    console.log(`Aktywacja dokumentów dla czatu ${chatId}: ${documentIds.join(', ')}`);
    
    // Sprawdź, czy czat należy do zalogowanego użytkownika
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id
      },
      select: {
        id: true,
        activeDocuments: true
      }
    });
    
    if (!chat) {
      return NextResponse.json({ error: 'Czat nie znaleziony lub brak uprawnień' }, { status: 404 });
    }
    
    // Pobierz aktualną listę aktywnych dokumentów i dodaj nowe dokumenty
    const currentActiveDocuments = chat.activeDocuments || [];
    const newActiveDocuments = [...new Set([...currentActiveDocuments, ...documentIds])];
    
    // Zaktualizuj listę dokumentów czatu
    try {
      const updatedChat = await prisma.chat.update({
        where: {
          id: chatId
        },
        data: {
          activeDocuments: newActiveDocuments
        }
      });
      
      console.log(`Zaktualizowano dokumenty dla czatu. Nowa ilość: ${newActiveDocuments.length}`);
      
      return NextResponse.json({ success: true, documentIds: newActiveDocuments });
    } catch (dbError) {
      console.error('Błąd podczas aktualizacji dokumentów czatu w bazie danych:', dbError);
      
      if (dbError instanceof Error) {
        console.error('Nazwa błędu:', dbError.name);
        console.error('Wiadomość błędu:', dbError.message);
        console.error('Stack trace:', dbError.stack);
      }
      
      return NextResponse.json({ 
        error: 'Wystąpił problem podczas aktualizacji dokumentów czatu',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Błąd podczas aktywacji dokumentów:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas aktywacji dokumentów',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}