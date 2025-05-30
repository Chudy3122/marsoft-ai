// src/app/api/documents/all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface KnowledgeDocument {
  id: string;
  title: string;
  fileType: string;
  createdAt: Date;
  category?: {
    name: string;
  };
}
const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401 });
  }
  
  try {
    const userId = session.user.id as string;
    
    // Pobierz dokumenty z czatów użytkownika
    const chatDocuments = await prisma.document.findMany({
      where: {
        chat: {
          userId: userId
        }
      },
      select: {
        id: true,
        title: true,
        fileType: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Pobierz dokumenty z biblioteki wiedzy (jeśli są dostępne)
    let knowledgeDocuments: KnowledgeDocument[] = [];
  try {
    knowledgeDocuments = await prisma.knowledgeDocument.findMany({
      select: {
        id: true,
        title: true,
        fileType: true,
        createdAt: true,
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (error) {
    console.warn('Błąd podczas pobierania dokumentów z biblioteki wiedzy:', error);
    // Ignoruj błąd, jeśli tabela nie istnieje
  }
    
    // Połącz i sformatuj wyniki
    const allDocuments = [
      ...chatDocuments.map(doc => ({
        id: doc.id,
        title: doc.title,
        type: 'chat',
        fileType: doc.fileType,
        createdAt: doc.createdAt
      })),
      ...(knowledgeDocuments || []).map((doc: KnowledgeDocument) => ({
      id: doc.id,
      title: `${doc.title} (${doc.category?.name || 'Biblioteka wiedzy'})`,
      type: 'knowledge',
      fileType: doc.fileType,
      createdAt: doc.createdAt
}))
    ];
    
    // Sortuj po dacie (od najnowszych)
    allDocuments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return NextResponse.json({ 
      documents: allDocuments 
    });
  } catch (error) {
    console.error('Błąd podczas pobierania dokumentów:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania dokumentów' }, 
      { status: 500 }
    );
  }
}