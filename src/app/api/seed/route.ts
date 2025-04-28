// src/app/api/seed/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    // Sprawdź, czy istnieją jakiekolwiek kategorie
    const categoriesCount = await prisma.knowledgeCategory.count();
    
    if (categoriesCount === 0) {
      console.log("Brak kategorii, tworzenie domyślnych kategorii...");
      
      // Jeśli nie ma kategorii, utwórz kilka przykładowych
      const categories = await prisma.knowledgeCategory.createMany({
        data: [
          {
            name: "Projekty UE",
            parentId: null
          },
          {
            name: "Wnioski o dofinansowanie",
            parentId: null
          },
          {
            name: "Dokumentacja projektowa",
            parentId: null
          },
          {
            name: "Raporty i analizy",
            parentId: null
          }
        ]
      });
      
      console.log(`Utworzono ${categories.count} domyślnych kategorii`);
      
      return NextResponse.json({ 
        message: 'Inicjalizacja bazy danych zakończona pomyślnie', 
        addedCategories: categories.count 
      });
    }
    
    return NextResponse.json({ 
      message: 'Baza danych już zainicjalizowana', 
      categoriesCount
    });
  } catch (error) {
    console.error('Błąd podczas inicjalizacji bazy danych:', error);
    return NextResponse.json({ 
      error: 'Wystąpił problem podczas inicjalizacji bazy danych',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}