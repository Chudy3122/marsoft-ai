// src/app/api/projects/generate-from-document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { detectDeadlinesInDocument } from '@/lib/deadline-detection';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401 });
  }
  
  try {
    const userId = session.user.id as string;
    const body = await req.json();
    const { documentId } = body;
    
    if (!documentId) {
      return NextResponse.json({ error: 'Nie podano ID dokumentu' }, { status: 400 });
    }
    
    // Najpierw spróbuj znaleźć dokument w czatach
    let document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { chat: true }
    });
    
    let documentContent: string | null = null;
    let documentTitle: string = 'Nowy projekt';
    
    // Sprawdź, czy dokument istnieje i należy do użytkownika (jeśli z czatu)
    if (document) {
      if (document.chat.userId !== userId) {
        return NextResponse.json({ error: 'Brak dostępu do tego dokumentu' }, { status: 403 });
      }
      documentContent = document.content || '';
      documentTitle = document.title || 'Nowy projekt';
    } else {
      // Jeśli nie znaleziono w czatach, spróbuj w bibliotece wiedzy
      const knowledgeDocument = await prisma.knowledgeDocument.findUnique({
        where: { id: documentId }
      });
      
      if (!knowledgeDocument) {
        return NextResponse.json({ error: 'Dokument nie został znaleziony' }, { status: 404 });
      }
      
      documentContent = knowledgeDocument.content || '';
      documentTitle = knowledgeDocument.title || 'Nowy projekt';
    }
    
    if (!documentContent) {
      return NextResponse.json({ error: 'Dokument nie zawiera treści' }, { status: 400 });
    }
    
    // Wykryj terminy i utwórz projekt na podstawie dokumentu
    const result = await detectDeadlinesInDocument(documentId);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Wystąpił błąd podczas analizy dokumentu' }, { status: 500 });
    }
    
    // Zwróć ID utworzonego projektu
    return NextResponse.json({ 
      success: true, 
      project: result.project,
      itemsCreated: {
        tasks: result.createdItems?.filter(item => item.type === 'task').length || 0,
        milestones: result.createdItems?.filter(item => item.type === 'milestone').length || 0
      },
      message: `Utworzono projekt "${result.project?.name}" z ${result.totalCreated || 0} wykrytymi terminami.`
    });
  } catch (error) {
    console.error('Błąd podczas generowania projektu z dokumentu:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas generowania projektu' }, 
      { status: 500 }
    );
  }
}