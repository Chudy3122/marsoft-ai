// src/app/api/knowledge/categories/check/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
            name: "Projekty UE",
            description: "Dokumentacja i materiały dotyczące projektów Unii Europejskiej",
            isPublic: true,
            createdBy: "system@marsoft.pl",
            createdByName: "System"
          },
          {
            name: "Wnioski o dofinansowanie",
            description: "Szablony i przykłady wniosków o dofinansowanie",
            isPublic: true,
            createdBy: "system@marsoft.pl",
            createdByName: "System"
          },
          {
            name: "Harmonogramy projektów",
            description: "Przykładowe harmonogramy i planowanie projektów",
            isPublic: true,
            createdBy: "system@marsoft.pl",
            createdByName: "System"
          },
          {
            name: "Budżety i rozliczenia",
            description: "Materiały dotyczące budżetowania i rozliczeń projektów UE",
            isPublic: true,
            createdBy: "system@marsoft.pl",
            createdByName: "System"
          }
        ]
      });
      
      return NextResponse.json({ 
        message: 'Utworzono domyślne kategorie', 
        categoriesCount: 4 
      });
    }
    
    return NextResponse.json({ 
      message: 'Kategorie już istnieją', 
      categoriesCount 
    });
  } catch (error) {
    console.error('Błąd podczas sprawdzania kategorii:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas sprawdzania kategorii',
      details: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 });
  }
}