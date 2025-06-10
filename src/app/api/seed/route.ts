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
            description: "Dokumentacja i materiały dotyczące projektów Unii Europejskiej",
            isPublic: true,
            createdBy: "system@marsoft.pl",
            createdByName: "System MarsoftAI"
          },
          {
            name: "Wnioski o dofinansowanie",
            description: "Szablony i przykłady wniosków o dofinansowanie ze środków UE",
            isPublic: true,
            createdBy: "system@marsoft.pl",
            createdByName: "System MarsoftAI"
          },
          {
            name: "Dokumentacja projektowa",
            description: "Dokumenty projektowe, specyfikacje i wymagania",
            isPublic: true,
            createdBy: "system@marsoft.pl",
            createdByName: "System MarsoftAI"
          },
          {
            name: "Raporty i analizy",
            description: "Raporty z realizacji projektów i analizy finansowe",
            isPublic: true,
            createdBy: "system@marsoft.pl",
            createdByName: "System MarsoftAI"
          },
          {
            name: "Harmonogramy projektów",
            description: "Plany czasowe i harmonogramy realizacji projektów",
            isPublic: true,
            createdBy: "system@marsoft.pl",
            createdByName: "System MarsoftAI"
          },
          {
            name: "Budżety i rozliczenia",
            description: "Budżety projektów, kosztorysy i dokumenty rozliczeniowe",
            isPublic: true,
            createdBy: "system@marsoft.pl",
            createdByName: "System MarsoftAI"
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