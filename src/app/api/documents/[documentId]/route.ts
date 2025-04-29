// src/app/api/documents/[documentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const documentId = params.documentId;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
    }
    
    console.log(`Pobieranie dokumentu o ID: ${documentId}`);
    
    // Pobierz dokument
    const document = await prisma.document.findUnique({
      where: {
        id: documentId
      },
      include: {
        chat: {
          select: {
            userId: true
          }
        }
      }
    });
    
    // Sprawdź, czy dokument istnieje
    if (!document) {
      console.error(`Dokument o ID ${documentId} nie znaleziony`);
      return NextResponse.json({ error: 'Dokument nie znaleziony' }, { status: 404 });
    }
    
    // Sprawdź, czy użytkownik ma uprawnienia do dokumentu
    if (document.chat.userId !== session.user.id) {
      console.error(`Użytkownik ${session.user.id} nie ma dostępu do dokumentu ${documentId}`);
      return NextResponse.json({ error: 'Brak uprawnień do dokumentu' }, { status: 403 });
    }
    
    console.log(`Dokument ${documentId} znaleziony, zwracanie treści`);
    
    return NextResponse.json({ document });
  } catch (error) {
    console.error('Błąd podczas pobierania dokumentu:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Wystąpił problem podczas pobierania dokumentu'
    }, { status: 500 });
  }
}