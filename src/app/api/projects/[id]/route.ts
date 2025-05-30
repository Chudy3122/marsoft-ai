// src/app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
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
    
    // Sprawdź, czy projekt istnieje i należy do użytkownika
    const project = await prisma.project.findUnique({
      where: {
        id,
        userId
      }
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Projekt nie został znaleziony' }, { status: 404 });
    }
    
    // Pobierz zadania projektu
    const tasks = await prisma.task.findMany({
      where: {
        projectId: id
      },
      orderBy: {
        startDate: 'asc'
      }
    });
    
    // Pobierz kamienie milowe projektu
    const milestones = await prisma.milestone.findMany({
      where: {
        projectId: id
      },
      orderBy: {
        dueDate: 'asc'
      }
    });
    
    return NextResponse.json({
      project,
      tasks,
      milestones
    });
  } catch (error) {
    console.error('Błąd podczas pobierania szczegółów projektu:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania szczegółów projektu' }, 
      { status: 500 }
    );
  }
}

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
    
    // Sprawdź, czy projekt istnieje i należy do użytkownika
    const project = await prisma.project.findUnique({
      where: {
        id,
        userId
      }
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Projekt nie został znaleziony' }, { status: 404 });
    }
    
    // Aktualizuj projekt
    const updatedProject = await prisma.project.update({
      where: { id },
      data: body
    });
    
    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error('Błąd podczas aktualizacji projektu:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas aktualizacji projektu' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    
    // Sprawdź, czy projekt istnieje i należy do użytkownika
    const project = await prisma.project.findUnique({
      where: {
        id,
        userId
      }
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Projekt nie został znaleziony' }, { status: 404 });
    }
    
    // Usuń projekt
    await prisma.project.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Błąd podczas usuwania projektu:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas usuwania projektu' }, 
      { status: 500 }
    );
  }
}