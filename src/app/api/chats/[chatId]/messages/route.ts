// src/app/api/chats/[chatId]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    // Dodaj szczegółowe logowanie
    console.log("Pobieranie wiadomości dla czatu:", chatId);
    console.log("ID użytkownika:", session.user.id);

    // Sprawdź, czy czat należy do zalogowanego użytkownika
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id
      },
      // Wybierz tylko potrzebne pola, aby uniknąć problemów z typami
      select: {
        id: true,
        title: true,
        userId: true
      }
    });

    console.log("Znaleziony czat:", chat ? "Tak" : "Nie");

    if (!chat) {
      console.error(`Czat o ID ${chatId} nie znaleziony lub brak uprawnień`);
      return NextResponse.json({ error: 'Czat nie znaleziony lub brak uprawnień' }, { status: 404 });
    }

    // Bezpieczne pobieranie wiadomości z obsługą błędów
    try {
      const messages = await prisma.message.findMany({
        where: {
          chatId: chatId
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      
      console.log(`Pobrano ${messages.length} wiadomości dla czatu ${chatId}`);
      
      return NextResponse.json({ messages });
    } catch (messagesError) {
      console.error('Błąd podczas pobierania wiadomości:', messagesError);
      return NextResponse.json({ 
        error: 'Problem z pobraniem wiadomości', 
        details: messagesError instanceof Error ? messagesError.message : String(messagesError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Błąd podczas obsługi żądania wiadomości:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas pobierania wiadomości',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

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

    // Sprawdź, czy czat należy do zalogowanego użytkownika
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id
      },
      // Wybierz tylko potrzebne pola
      select: {
        id: true, 
        userId: true
      }
    });

    if (!chat) {
      return NextResponse.json({ error: 'Czat nie znaleziony lub brak uprawnień' }, { status: 404 });
    }

    // Pobierz dane wiadomości
    let messageData;
    try {
      messageData = await request.json();
    } catch (parseError) {
      console.error("Błąd parsowania JSON:", parseError);
      return NextResponse.json({ error: 'Błąd parsowania danych wiadomości' }, { status: 400 });
    }
    
    const { content, role } = messageData;
    
    if (!content || !role) {
      return NextResponse.json({ error: 'Brakuje treści lub roli wiadomości' }, { status: 400 });
    }

    // Zapisz wiadomość
    const message = await prisma.message.create({
      data: {
        content,
        role,
        chatId
      }
    });

    // Aktualizuj datę ostatniej modyfikacji czatu
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Błąd podczas zapisywania wiadomości:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas zapisywania wiadomości',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}