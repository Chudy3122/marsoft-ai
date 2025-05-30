// src/app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseDocumentFile } from '@/lib/file-parsers';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401 });
  }
  
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Nie znaleziono pliku w żądaniu' }, { status: 400 });
    }
    
    // Stwórz nowy czat dla dokumentu
    const chat = await prisma.chat.create({
      data: {
        title: `Harmonogram - ${file.name}`,
        userId: session.user.id as string
      }
    });
    
    // Parsuj plik i wyciągnij treść dokumentu
    const { content, fileType, metadata } = await parseDocumentFile(file);
    
    // Zapisz dokument w bazie danych
    const document = await prisma.document.create({
      data: {
        title: file.name,
        fileType,
        content,
        metadata,
        pages: metadata?.pages || null,
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
    console.error('Błąd podczas wgrywania dokumentu:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas wgrywania dokumentu' }, 
      { status: 500 }
    );
  }
}