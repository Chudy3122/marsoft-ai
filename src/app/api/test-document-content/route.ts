// src/app/api/test-document-content/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
    
    // Sprawdź czy content istnieje i nie jest null
    const content = document.content || '';
    const contentPreview = content.length > 0 
      ? content.substring(0, 500) + (content.length > 500 ? '...' : '')
      : 'Brak zawartości';
    
    return NextResponse.json({ 
      document: {
        ...document,
        contentPreview: contentPreview,
        contentLength: content.length,
        hasContent: content.length > 0
      } 
    });
  } catch (error) {
    console.error('Błąd podczas pobierania dokumentu:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas pobierania dokumentu',
      details: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 });
  }
}