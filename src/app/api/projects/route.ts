// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401 });
  }
  
  try {
    const userId = session.user.id as string;
    
    const projects = await prisma.project.findMany({
      where: {
        userId: userId
      },
      include: {
        tasks: true,
        milestones: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Błąd podczas pobierania projektów:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania projektów' }, 
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Nie jesteś zalogowany' }, { status: 401 });
  }
  
  try {
    const userId = session.user.id as string;
    const body = await req.json();
    const { name, description, startDate, endDate } = body;
    
    const newProject = await prisma.project.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        userId: userId
      }
    });
    
    return NextResponse.json({ project: newProject }, { status: 201 });
  } catch (error) {
    console.error('Błąd podczas tworzenia projektu:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas tworzenia projektu' }, 
      { status: 500 }
    );
  }
}