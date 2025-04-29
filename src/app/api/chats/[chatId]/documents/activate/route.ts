// src/app/api/chats/[chatId]/documents/activate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Aktywacja dokumentów - może aktywować jeden lub wiele dokumentów
export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions);
  const chatId = params.chatId;
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
  }

  if (!chatId) {
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
      return NextResponse.json({ error: 'Czat nie znaleziony lub brak uprawnień' }, { status: 404 });
    }

    const { documentIds, activateAll = false } = await request.json();
    
    // Wybierz dokumenty do aktywacji
    let documentsToActivate: string[] = [];
    
    if (activateAll) {
      // Ponieważ uploadedDocuments może nie istnieć w niektórych czatach,
      // pobierzmy wszystkie dokumenty dla tego czatu z bazy danych
      const allDocuments = await prisma.document.findMany({
        where: {
          chatId: chatId
        },
        select: {
          id: true
        }
      });
      
      documentsToActivate = allDocuments.map(doc => doc.id);
    } else if (Array.isArray(documentIds) && documentIds.length > 0) {
      // Aktywuj tylko wybrane dokumenty
      documentsToActivate = documentIds;
    } else {
      return NextResponse.json({ error: 'Nie określono dokumentów do aktywacji' }, { status: 400 });
    }
    
    // Aktualizuj aktywne dokumenty
    await prisma.chat.update({
      where: { id: chatId },
      data: {
        activeDocuments: documentsToActivate
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      activeDocuments: documentsToActivate,
      message: `Aktywowano ${documentsToActivate.length} dokument(ów)`
    });
  } catch (error) {
    console.error('Błąd podczas aktywacji dokumentów:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Wystąpił problem podczas aktywacji dokumentów'
    }, { status: 500 });
  }
}