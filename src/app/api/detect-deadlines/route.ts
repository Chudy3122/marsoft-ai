// src/app/api/detect-deadlines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { detectDeadlinesInDocument } from '@/lib/deadline-detection';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { documentId } = body;
    
    if (!documentId) {
      return NextResponse.json({ error: 'Brak ID dokumentu' }, { status: 400 });
    }
    
    const result = await detectDeadlinesInDocument(documentId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Błąd podczas wykrywania terminów:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas wykrywania terminów', details: (error as Error).message }, 
      { status: 500 }
    );
  }
}