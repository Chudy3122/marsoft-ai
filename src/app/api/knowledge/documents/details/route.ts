// src/app/api/knowledge/documents/details/route.ts
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
    const ids = url.searchParams.get('ids')?.split(',') || [];
    
    if (ids.length === 0) {
      return NextResponse.json({ documents: [] });
    }
    
    console.log(`Pobieranie szczegółów dokumentów dla ID: ${ids.join(', ')}`);
    
    const documents = await prisma.knowledgeDocument.findMany({
      where: {
        id: {
          in: ids
        }
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
    console.error('Błąd podczas pobierania szczegółów dokumentów:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas pobierania szczegółów dokumentów',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}