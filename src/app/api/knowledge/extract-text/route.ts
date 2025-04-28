// src/app/api/knowledge/extract-text/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

import { join } from 'path';
import { writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';

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
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Brak pliku' }, { status: 400 });
    }
    
    // Sprawdź typ pliku
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Nieprawidłowy format pliku. Wymagany jest PDF.' }, { status: 400 });
    }
    
    try {
      // Konwertuj plik do bufora
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Użyj pdf-parse do ekstrakcji tekstu
      const pdfData = await pdfParse(buffer);
      
      return NextResponse.json({ 
        success: true,
        text: pdfData.text,
        pages: pdfData.numpages
      });
      
    } catch (error) {
      console.error('Błąd podczas przetwarzania PDF:', error);
      return NextResponse.json({ 
        error: 'Błąd podczas przetwarzania PDF', 
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Ogólny błąd podczas ekstrakcji tekstu:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas ekstrakcji tekstu',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}