// app/api/test/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    // Próba wykonania prostej operacji na bazie
    const userCount = await prisma.user.count();
    return NextResponse.json({ 
      success: true, 
      message: "Połączenie z bazą działa poprawnie", 
      userCount 
    });
  } catch (error) {
    console.error('Błąd połączenia z bazą:', error);
    return NextResponse.json({ 
      error: "Wystąpił problem z połączeniem do bazy danych",
      details: String(error)
    }, { status: 500 });
  }
}