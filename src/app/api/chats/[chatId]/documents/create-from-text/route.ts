// src/app/api/documents/create-from-text/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { title, content, fileType } = body;
    
    if (!content) {
      return NextResponse.json({ error: 'Brak treści dokumentu' }, { status: 400 });
    }
    
    // Stwórz nowy czat dla dokumentu
    const chat = await prisma.chat.create({
      data: {
        title: `Harmonogram - ${title || 'Bez tytułu'}`,
        userId: session.user.id as string
      }
    });
    
    // Zapisz dokument w bazie danych
    const document = await prisma.document.create({
      data: {
        title: title || 'Dokument tekstowy',
        fileType: fileType || 'text',
        content,
        chatId: chat.id
      }
    });
    
    // Dodaj dokument do aktywnych dokumentów czatu
    await prisma.chat.update({
      where: { id: chat.id },
      data: {
        activeDocuments: [document.id]
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      document: {
        id: document.id,
        title: document.title,
        fileType: document.fileType
      }
    });
  } catch (error) {
    console.error('Błąd podczas tworzenia dokumentu:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas tworzenia dokumentu' }, 
      { status: 500 }
    );
  }
}