// src/app/api/chats/[chatId]/document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';


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

    const { title, fileType, content, pages, rows, columns, metadata } = await request.json();

    if (!content || !title || !fileType) {
      return NextResponse.json({ error: 'Brak wymaganych danych dokumentu' }, { status: 400 });
    }

    // Sprawdź, czy istnieje już dokument dla tego czatu
    const existingDoc = await prisma.document.findUnique({
      where: {
        chatId: chatId
      }
    });

    let document;

    if (existingDoc) {
      // Aktualizuj istniejący dokument
      document = await prisma.document.update({
        where: {
          chatId: chatId
        },
        data: {
          title,
          fileType,
          content,
          pages,
          rows,
          columns,
          metadata
        }
      });
    } else {
      // Utwórz nowy dokument
      document = await prisma.document.create({
        data: {
          title,
          fileType,
          content,
          pages,
          rows,
          columns,
          metadata,
          chatId
        }
      });
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Błąd podczas zapisywania dokumentu:', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas zapisywania dokumentu' }, { status: 500 });
  }
}

// Pobieranie dokumentu
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions);
  const chatId = params.chatId;
  
  console.log("Pobieranie dokumentu dla czatu:", chatId);

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

    // Pobierz dokument dla tego czatu
    const document = await prisma.document.findUnique({
      where: {
        chatId: chatId
      }
    });

    if (!document) {
      return NextResponse.json({ document: null });
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Błąd podczas pobierania dokumentu:', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas pobierania dokumentu' }, { status: 500 });
  }
}

// Usuwanie dokumentu
export async function DELETE(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions);
  const chatId = params.chatId;
  
  console.log("Usuwanie dokumentu dla czatu:", chatId);

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

    // Usuń dokument
    await prisma.document.delete({
      where: {
        chatId: chatId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Błąd podczas usuwania dokumentu:', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas usuwania dokumentu' }, { status: 500 });
  }
}