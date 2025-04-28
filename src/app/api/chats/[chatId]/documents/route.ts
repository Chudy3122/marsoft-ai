// src/app/api/chats/[chatId]/documents/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';


export const dynamic = 'force-dynamic';
// Pobieranie dokumentów przypisanych do czatu
export async function GET(
  request: Request,
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
        activeDocuments: true
      }
    });
    
    if (!chat) {
      return NextResponse.json({ error: 'Czat nie znaleziony lub brak uprawnień' }, { status: 404 });
    }
    
    console.log(`Znaleziono ${chat.activeDocuments.length} aktywnych dokumentów dla czatu`);
    
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
  request: Request,
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
    
    const { documentIds } = await request.json();
    
    if (!Array.isArray(documentIds)) {
      return NextResponse.json({ error: 'Nieprawidłowy format danych' }, { status: 400 });
    }
    
    console.log(`Aktualizacja dokumentów dla czatu ${chatId}: ${documentIds.join(', ')}`);
    
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
    
    // Zaktualizuj listę dokumentów czatu
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
  } catch (error) {
    console.error('Błąd podczas aktualizacji dokumentów czatu:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas aktualizacji dokumentów czatu',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}