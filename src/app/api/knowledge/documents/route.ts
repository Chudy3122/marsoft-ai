// src/app/api/knowledge/documents/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

import prisma from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('categoryId');
    
    console.log(`Pobieranie dokumentów dla kategorii: ${categoryId || 'wszystkie'}`);
    
    const documents = await prisma.knowledgeDocument.findMany({
      where: categoryId ? {
        categoryId: categoryId
      } : undefined,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        fileType: true,
        categoryId: true,
        createdAt: true
      }
    });
    
    console.log(`Znaleziono ${documents.length} dokumentów`);
    
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Błąd podczas pobierania dokumentów:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas pobierania dokumentów',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
    }
    
    // Sprawdź, czy użytkownik ma rolę admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }
    
    const body = await request.json();
    const { title, fileType, content, categoryId } = body;
    
    if (!title || !fileType || !content || !categoryId) {
      return NextResponse.json({ error: 'Wszystkie pola są wymagane' }, { status: 400 });
    }
    
    console.log("Próba zapisania dokumentu:", {
      title,
      fileType,
      categoryId,
      contentLength: content.length
    });
    
    try {
      // Użycie connect zamiast bezpośredniego przypisania categoryId
      const document = await prisma.knowledgeDocument.create({
        data: {
          title,
          fileType,
          content,
          category: {
            connect: {
              id: categoryId
            }
          }
        }
      });
      
      console.log("Dokument zapisany w bazie danych:", {
        id: document.id,
        title: document.title,
        categoryId: document.categoryId
      });
      
      return NextResponse.json({ document });
    } catch (prismaError) {
      console.error('Szczegółowy błąd Prismy:', prismaError);
      return NextResponse.json({ 
        error: 'Błąd bazy danych podczas dodawania dokumentu', 
        details: prismaError instanceof Error ? prismaError.message : String(prismaError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Ogólny błąd podczas dodawania dokumentu:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas dodawania dokumentu',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}