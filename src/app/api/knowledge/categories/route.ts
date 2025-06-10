// app/api/knowledge/categories/route.ts - PEŁNA WERSJA z obsługą wszystkich funkcji
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Pobieranie kategorii
export async function GET(request: NextRequest) {
  try {
    // Sprawdź autoryzację
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      );
    }

    console.log(`📚 Pobieranie kategorii przez użytkownika: ${session.user?.email || 'unknown'}`);

    // Pobierz kategorie z odpowiednim filtrowaniem
    const categories = await prisma.knowledgeCategory.findMany({
      where: {
        OR: [
          { isPublic: true }, // Publiczne kategorie
          { createdBy: session.user?.email || '' } // Prywatne kategorie użytkownika
        ]
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`✅ Pobrano ${categories.length} kategorii dla użytkownika ${session.user?.email || 'unknown'}`);

    return NextResponse.json({
      success: true,
      categories: categories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        isPublic: category.isPublic,
        hasPassword: !!category.password,
        createdBy: category.createdByName || category.createdBy,
        isOwner: category.createdBy === (session.user?.email || ''),
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }))
    });

  } catch (error) {
    console.error('❌ Błąd podczas pobierania kategorii:', error);
    return NextResponse.json(
      { 
        error: 'Wystąpił błąd podczas pobierania kategorii',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  }
}

// Tworzenie nowej kategorii
export async function POST(request: NextRequest) {
  try {
    // Sprawdź autoryzację
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      );
    }

    const { name, description, isPublic, password } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nazwa kategorii jest wymagana' },
        { status: 400 }
      );
    }

    console.log(`📁 Tworzenie kategorii "${name}" przez użytkownika: ${session.user?.email || 'unknown'}`, {
      isPublic: isPublic !== false,
      hasPassword: !!password
    });

    // Sprawdź czy kategoria o takiej nazwie już istnieje
    const existingCategory = await prisma.knowledgeCategory.findUnique({
      where: { name: name.trim() }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Kategoria o takiej nazwie już istnieje' },
        { status: 400 }
      );
    }

    // Hashuj hasło jeśli zostało podane
    let hashedPassword = null;
    if (password && password.trim()) {
      const crypto = require('crypto');
      hashedPassword = crypto.createHash('sha256').update(password.trim()).digest('hex');
    }

    // Utwórz nową kategorię
    const newCategory = await prisma.knowledgeCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: isPublic !== false, // Domyślnie true
        password: hashedPassword,
        createdBy: session.user?.email || 'unknown',
        createdByName: session.user?.name || session.user?.email || 'Użytkownik'
      }
    });

    console.log(`✅ Utworzono kategorię: ${newCategory.id}`);

    return NextResponse.json({
      success: true,
      message: 'Kategoria została utworzona pomyślnie',
      category: {
        id: newCategory.id,
        name: newCategory.name,
        description: newCategory.description,
        isPublic: newCategory.isPublic,
        hasPassword: !!newCategory.password,
        createdBy: newCategory.createdByName,
        isOwner: true,
        createdAt: newCategory.createdAt,
        updatedAt: newCategory.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Błąd podczas tworzenia kategorii:', error);
    return NextResponse.json(
      { 
        error: 'Wystąpił błąd podczas tworzenia kategorii',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  }
}