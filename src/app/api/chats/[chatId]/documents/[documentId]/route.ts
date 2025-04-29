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
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        chatId
      }
    });

    if (!document) {
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

// Usuwanie dokumentu z aktywnych
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

    // Usuń dokument z listy aktywnych dokumentów czatu
    if (chat.activeDocuments) {
      const updatedActiveDocuments = chat.activeDocuments.filter(id => id !== documentId);
      
      await prisma.chat.update({
        where: { id: chatId },
        data: {
          activeDocuments: updatedActiveDocuments
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Błąd podczas usuwania dokumentu z aktywnych:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Wystąpił problem podczas usuwania dokumentu z aktywnych'
    }, { status: 500 });
  }
}