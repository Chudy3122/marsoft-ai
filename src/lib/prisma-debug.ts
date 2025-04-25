// src/lib/prisma-debug.ts
// Ten plik pomoże zdiagnozować problemy z klientem Prisma

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Wypisz wszystkie dostępne modele i ich metody
console.log('Dostępne modele w kliencie Prisma:');
console.log(Object.keys(prisma));

// Sprawdź, czy model pdfDocument jest dostępny
console.log('Sprawdzanie modelu pdfDocument:');
// @ts-ignore - celowo ignorujemy błędy TypeScript w tym pliku diagnostycznym
console.log(prisma.pdfDocument ? 'Model pdfDocument istnieje' : 'Model pdfDocument nie istnieje');

// Sprawdź, czy model PdfDocument (z wielką literą) jest dostępny
console.log('Sprawdzanie modelu PdfDocument (z wielką literą):');
// @ts-ignore - celowo ignorujemy błędy TypeScript w tym pliku diagnostycznym
console.log(prisma.PdfDocument ? 'Model PdfDocument istnieje' : 'Model PdfDocument nie istnieje');

// Zamknij połączenie z bazą danych
prisma.$disconnect();

/*
 * Instrukcja użycia:
 * 1. Zapisz ten plik w projekcie
 * 2. Uruchom go za pomocą polecenia: npx ts-node src/lib/prisma-debug.ts
 * 3. Sprawdź wyniki w konsoli, aby zobaczyć, jakie modele są dostępne
 */