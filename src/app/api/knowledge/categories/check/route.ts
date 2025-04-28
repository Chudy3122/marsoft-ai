// src/app/api/knowledge/categories/check/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    // Sprawdź, czy istnieją jakiekolwiek kategorie
    const categoriesCount = await prisma.knowledgeCategory.count();
    
    if (categoriesCount === 0) {
      // Jeśli nie ma kategorii, utwórz kilka przykładowych
      await prisma.knowledgeCategory.createMany({
        data: [
          {
            id: "1", 
            name: "Projekty UE",
            parentId: null
          },
          {
            id: "2",
            name: "Wnioski o dofinansowanie",
            parentId: null
          }
        ]
      });
      
      return NextResponse.json({ 
        message: 'Utworzono domyślne kategorie', 
        categoriesCount: 2 
      });
    }
    
    return NextResponse.json({ 
      message: 'Kategorie już istnieją', 
      categoriesCount 
    });
  } catch (error) {
    console.error('Błąd podczas sprawdzania kategorii:', error);
    return NextResponse.json({ error: 'Wystąpił problem podczas sprawdzania kategorii' }, { status: 500 });
  }
}