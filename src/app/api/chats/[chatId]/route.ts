// src/app/api/chats/[chatId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Pobieranie pojedynczego czatu
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions);
  const chatId = params.chatId;
  
  console.log("Pobieranie czatu o ID:", chatId);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
  }

  if (!chatId) {
    console.error("Brak ID czatu w parametrach");
    return NextResponse.json({ error: 'Nieprawidłowe ID czatu' }, { status: 400 });
  }

  try {
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id
      }
    });

    if (!chat) {
      console.error(`Czat o ID ${chatId} nie znaleziony lub brak uprawnień`);
      return NextResponse.json({ error: 'Czat nie znaleziony' }, { status: 404 });
    }

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('Błąd podczas pobierania czatu:', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas pobierania czatu' }, { status: 500 });
  }
}

// Aktualizacja czatu (np. zmiana tytułu)
export async function PUT(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions);
  const chatId = params.chatId;
  
  console.log("Aktualizacja czatu o ID:", chatId);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
  }

  if (!chatId) {
    console.error("Brak ID czatu w parametrach");
    return NextResponse.json({ error: 'Nieprawidłowe ID czatu' }, { status: 400 });
  }

  try {
    const { title } = await request.json();

    // Sprawdź, czy czat należy do zalogowanego użytkownika
    const existingChat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id
      }
    });

    if (!existingChat) {
      console.error(`Czat o ID ${chatId} nie znaleziony lub brak uprawnień`);
      return NextResponse.json({ error: 'Czat nie znaleziony' }, { status: 404 });
    }

    const updatedChat = await prisma.chat.update({
      where: {
        id: chatId
      },
      data: {
        title,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ chat: updatedChat });
  } catch (error) {
    console.error('Błąd podczas aktualizacji czatu:', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas aktualizacji czatu' }, { status: 500 });
  }
}

// Usuwanie czatu
export async function DELETE(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions);
  const chatId = params.chatId;
  
  console.log("Usuwanie czatu o ID:", chatId);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
  }

  if (!chatId) {
    console.error("Brak ID czatu w parametrach");
    return NextResponse.json({ error: 'Nieprawidłowe ID czatu' }, { status: 400 });
  }

  try {
    // Sprawdź, czy czat należy do zalogowanego użytkownika
    const existingChat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id
      }
    });

    if (!existingChat) {
      console.error(`Czat o ID ${chatId} nie znaleziony lub brak uprawnień`);
      return NextResponse.json({ error: 'Czat nie znaleziony' }, { status: 404 });
    }

    // Najpierw usuń wszystkie wiadomości czatu
    await prisma.message.deleteMany({
      where: {
        chatId: chatId
      }
    });

    // Następnie usuń sam czat
    await prisma.chat.delete({
      where: {
        id: chatId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Błąd podczas usuwania czatu:', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas usuwania czatu' }, { status: 500 });
  }
}