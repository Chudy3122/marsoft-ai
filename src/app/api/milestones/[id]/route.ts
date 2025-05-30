// src/app/api/milestones/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401 });
  }
  
  try {
    const { id } = params;
    const userId = session.user.id as string;
    const body = await req.json();
    
    // Najpierw pobierz kamień milowy, aby sprawdzić, czy należy do projektu użytkownika
    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        project: true
      }
    });
    
    if (!milestone) {
      return NextResponse.json({ error: 'Kamień milowy nie został znaleziony' }, { status: 404 });
    }
    
    // Sprawdź, czy projekt należy do użytkownika
    if (milestone.project.userId !== userId) {
      return NextResponse.json({ error: 'Brak dostępu do tego kamienia milowego' }, { status: 403 });
    }
    
    // Aktualizuj kamień milowy
    const updatedMilestone = await prisma.milestone.update({
      where: { id },
      data: body
    });
    
    return NextResponse.json({ milestone: updatedMilestone });
  } catch (error) {
    console.error('Błąd podczas aktualizacji kamienia milowego:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas aktualizacji kamienia milowego' }, 
      { status: 500 }
    );
  }
}