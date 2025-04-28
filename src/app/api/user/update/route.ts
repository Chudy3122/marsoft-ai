// src/app/api/user/update/route.ts
import { NextResponse } from 'next/server';
import getServerSession from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Sprawdzamy czy sesja istnieje
    if (!session) {
      return NextResponse.json(
        { error: "Nie jesteś zalogowany" },
        { status: 401 }
      );
    }
    
    // Wyloguj sesję aby zobaczyć jej strukturę
    console.log("Struktura sesji:", JSON.stringify(session, null, 2));
    
    // W NextAuth.js 5.0-beta, id użytkownika może być gdzie indziej
    // Możemy użyć typu 'any' tymczasowo, aby obejść błędy TypeScript
    const userId = (session as any).user?.id || (session as any).sub;
    
    if (!userId) {
      return NextResponse.json(
        { error: "Nie można znaleźć ID użytkownika" },
        { status: 400 }
      );
    }
    
    const { name } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: "Imię jest wymagane" },
        { status: 400 }
      );
    }
    
    // Aktualizuj dane użytkownika z naszym userId
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
    });
    
    // Zwróć zaktualizowane dane (bez hasła)
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Błąd aktualizacji profilu:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas aktualizacji profilu" },
      { status: 500 }
    );
  }
}