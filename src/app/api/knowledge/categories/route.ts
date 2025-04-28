// src/app/api/knowledge/categories/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Pobieranie sesji
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 });
    }
    
    console.log("Pobieranie kategorii - sesja użytkownika:", session.user.id);
    
    // Pobierz kategorie główne (bez rodzica)
    const rootCategories = await prisma.knowledgeCategory.findMany({
      where: {
        parentId: null
      },
      orderBy: {
        name: 'asc'
      },
      include: {
        subCategories: true
      }
    });
    
    console.log(`Znaleziono ${rootCategories.length} kategorii głównych`);
    
    return NextResponse.json({ categories: rootCategories });
  } catch (error) {
    console.error('Błąd podczas pobierania kategorii:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas pobierania kategorii',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

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
    
    const { name, parentId } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Nazwa kategorii jest wymagana' }, { status: 400 });
    }
    
    console.log("Tworzenie nowej kategorii:", { name, parentId });
    
    const category = await prisma.knowledgeCategory.create({
      data: {
        name,
        parentId: parentId || null
      }
    });
    
    console.log("Kategoria utworzona:", category);
    
    return NextResponse.json({ category });
  } catch (error) {
    console.error('Błąd podczas tworzenia kategorii:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas tworzenia kategorii',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}