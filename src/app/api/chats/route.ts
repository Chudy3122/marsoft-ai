// src/app/api/chats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Pobieranie wszystkich czatów
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
    }
    
    // Pobierz czaty użytkownika
    const chats = await prisma.chat.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Błąd podczas pobierania czatów:', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas pobierania czatów' }, { status: 500 });
  }
}

// Tworzenie nowego czatu
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
    }
    
    // Dekoduj dane żądania
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Błąd parsowania JSON:', error);
      return NextResponse.json({ error: 'Błąd parsowania danych żądania' }, { status: 400 });
    }
    
    // Inicjalizacja danych czatu z bezpiecznymi domyślnymi wartościami
    const chatData = {
      title: body.title || 'Nowa konwersacja',
      userId: session.user.id,
      // Upewnij się, że activeDocuments jest inicjalizowane jako pusta tablica
      activeDocuments: []
      // Nie używamy uploadedDocuments, to pole może nie istnieć w schemacie
    };
    
    // Logi dla debugowania
    console.log("Dane czatu do utworzenia:", chatData);
    
    try {
      // Utwórz czat
      const chat = await prisma.chat.create({
        data: chatData
      });
      
      console.log("Utworzono nowy czat:", chat.id);
      
      return NextResponse.json({ chat });
    } catch (dbError) {
      console.error('Błąd podczas tworzenia czatu w bazie danych:', dbError);
      
      // Szczegółowe logowanie błędu Prisma
      if (dbError instanceof Error) {
        console.error('Nazwa błędu:', dbError.name);
        console.error('Wiadomość błędu:', dbError.message);
        console.error('Stack trace:', dbError.stack);
      }
      
      return NextResponse.json({ 
        error: 'Wystąpił problem podczas tworzenia czatu',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Błąd podczas tworzenia czatu:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas tworzenia czatu',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}