// src/app/api/test-document-content/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Brak ID dokumentu' }, { status: 400 });
    }
    
    const document = await prisma.knowledgeDocument.findUnique({
      where: {
        id: id
      },
      select: {
        id: true,
        title: true,
        fileType: true,
        content: true,
        createdAt: true
      }
    });
    
    if (!document) {
      return NextResponse.json({ error: 'Dokument nie znaleziony' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      document: {
        ...document,
        contentPreview: document.content.substring(0, 500) + '...',
        contentLength: document.content.length
      } 
    });
  } catch (error) {
    console.error('Błąd podczas pobierania dokumentu:', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas pobierania dokumentu' }, { status: 500 });
  }
}