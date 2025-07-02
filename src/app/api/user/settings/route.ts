// src/app/api/user/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Sprawdź autentykację
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Nie jesteś zalogowany.' }, { status: 401 });
  }
  
  try {
    // Pobierz ustawienia użytkownika
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        webSearchEnabled: true,
        extendedReasoningEnabled: true // 👈 DODAJ TĘ LINIĘ
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Nie znaleziono użytkownika.' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      webSearchEnabled: user.webSearchEnabled,
      extendedReasoningEnabled: user.extendedReasoningEnabled || false // 👈 DODAJ TĘ LINIĘ
    });
  } catch (error) {
    console.error('Błąd podczas pobierania ustawień użytkownika:', error);
    return NextResponse.json({ error: 'Wystąpił błąd podczas pobierania ustawień.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // Sprawdź autentykację
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Nie jesteś zalogowany.' }, { status: 401 });
  }
  
  try {
    const data = await request.json();
    const { webSearchEnabled, extendedReasoningEnabled } = data; // 👈 DODAJ extendedReasoningEnabled
    
    // Przygotuj obiekt do aktualizacji
    const updateData: any = {};
    
    // Sprawdź webSearchEnabled
    if (typeof webSearchEnabled === 'boolean') {
      updateData.webSearchEnabled = webSearchEnabled;
    }
    
    // 👇 DODAJ TEN BLOK
    // Sprawdź extendedReasoningEnabled
    if (typeof extendedReasoningEnabled === 'boolean') {
      updateData.extendedReasoningEnabled = extendedReasoningEnabled;
    }
    
    // Sprawdź czy mamy coś do aktualizacji
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nieprawidłowe parametry.' }, { status: 400 });
    }
    
    // Aktualizuj ustawienia użytkownika
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
      select: { 
        webSearchEnabled: true,
        extendedReasoningEnabled: true // 👈 DODAJ TĘ LINIĘ
      }
    });
    
    return NextResponse.json({
      success: true,
      webSearchEnabled: user.webSearchEnabled,
      extendedReasoningEnabled: user.extendedReasoningEnabled // 👈 DODAJ TĘ LINIĘ
    });
  } catch (error) {
    console.error('Błąd podczas aktualizacji ustawień użytkownika:', error);
    return NextResponse.json({ error: 'Wystąpił błąd podczas aktualizacji ustawień.' }, { status: 500 });
  }
}