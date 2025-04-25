// src/app/api/chats/[chatId]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// Pobieranie wiadomości czatu
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions);
  const chatId = params.chatId;
  
  console.log("Pobieranie wiadomości dla czatu:", chatId);

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

    const messages = await prisma.message.findMany({
      where: {
        chatId: chatId
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Błąd podczas pobierania wiadomości:', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas pobierania wiadomości' }, { status: 500 });
  }
}

// Dodawanie nowej wiadomości
export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions);
  const chatId = params.chatId;
  
  console.log("Dodawanie wiadomości do czatu:", chatId);

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

    const { content, role } = await request.json();

    if (!content || !role) {
      return NextResponse.json({ error: 'Brak wymaganych danych' }, { status: 400 });
    }

    // Walidacja roli
    if (role !== 'user' && role !== 'assistant') {
      return NextResponse.json({ error: 'Nieprawidłowa rola. Dozwolone wartości: user, assistant' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        role,
        chatId
      }
    });

    // Zaktualizuj czas ostatniej modyfikacji czatu
    await prisma.chat.update({
      where: {
        id: chatId
      },
      data: {
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Błąd podczas dodawania wiadomości:', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas dodawania wiadomości' }, { status: 500 });
  }
}