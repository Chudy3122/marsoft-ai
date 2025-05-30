// src/app/api/chats/[chatId]/document/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseDocumentFile } from '@/lib/file-parsers';

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401 });
  }
  
  try {
    const { chatId } = params;
    
    // Sprawdź, czy czat istnieje i należy do użytkownika
    const chat = await prisma.chat.findUnique({
      where: {
        id: chatId,
        userId: session.user?.id as string
      }
    });
    
    if (!chat) {
      return NextResponse.json({ error: 'Czat nie został znaleziony lub nie masz do niego dostępu' }, { status: 404 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Nie znaleziono pliku w żądaniu' }, { status: 400 });
    }
    
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
       chatId
     }
   });
   
   // Dodaj dokument do aktywnych dokumentów czatu
   const activeDocuments = chat.activeDocuments || [];
   if (!activeDocuments.includes(document.id)) {
     await prisma.chat.update({
       where: { id: chatId },
       data: {
         activeDocuments: [...activeDocuments, document.id]
       }
     });
   }
   
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