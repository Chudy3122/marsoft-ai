// src/app/api/tasks/[id]/route.ts
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
    
    // Najpierw pobierz zadanie, aby sprawdzić, czy należy do projektu użytkownika
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true
      }
    });
    
    if (!task) {
      return NextResponse.json({ error: 'Zadanie nie zostało znalezione' }, { status: 404 });
    }
    
    // Sprawdź, czy projekt należy do użytkownika
    if (task.project.userId !== userId) {
      return NextResponse.json({ error: 'Brak dostępu do tego zadania' }, { status: 403 });
    }
    
    // Aktualizuj zadanie
    const updatedTask = await prisma.task.update({
      where: { id },
      data: body
    });
    
    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Błąd podczas aktualizacji zadania:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas aktualizacji zadania' }, 
      { status: 500 }
    );
  }
}