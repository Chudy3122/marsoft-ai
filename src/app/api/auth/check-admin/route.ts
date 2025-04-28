// src/app/api/auth/check-admin/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }
    
    // Sprawdź, czy użytkownik ma rolę administratora
    const isAdmin = session.user.role === 'admin';
    
    console.log(`Sprawdzanie uprawnień admina - użytkownik: ${session.user.id}, is admin: ${isAdmin}`);
    
    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Błąd podczas sprawdzania uprawnień:', error);
    return NextResponse.json({ 
      isAdmin: false, 
      error: 'Wystąpił problem podczas sprawdzania uprawnień'
    }, { status: 500 });
  }
}