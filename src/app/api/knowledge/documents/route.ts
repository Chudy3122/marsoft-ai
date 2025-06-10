// app/api/knowledge/documents/route.ts - POPRAWIONA WERSJA
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const onlyMy = searchParams.get('onlyMy') === 'true';
    const search = searchParams.get('search');
    const password = searchParams.get('password'); // NOWE: hasło

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Brak wymaganego parametru categoryId' },
        { status: 400 }
      );
    }

    console.log(`📚 Pobieranie dokumentów - kategoria: ${categoryId}, tylko moje: ${onlyMy}, wyszukiwanie: ${search || 'brak'}`);

    // NOWE: Sprawdź dostęp do kategorii i hasło
    const category = await prisma.knowledgeCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Kategoria nie została znaleziona' },
        { status: 404 }
      );
    }

    // Sprawdź dostęp do kategorii
    const isOwner = category.createdBy === session.user.email;
    const isPublic = category.isPublic;

    if (!isPublic && !isOwner) {
      return NextResponse.json(
        { error: 'Nie masz dostępu do tej kategorii' },
        { status: 403 }
      );
    }

    // NOWE: Sprawdź hasło jeśli kategoria jest chroniona
    if (category.password && !isOwner) {
      if (!password) {
        return NextResponse.json(
          { 
            error: 'Kategoria chroniona hasłem',
            requiresPassword: true 
          },
          { status: 403 }
        );
      }

      // Weryfikuj hasło
      const crypto = require('crypto');
      const hashedPassword = crypto.createHash('sha256').update(password.trim()).digest('hex');
      
      if (hashedPassword !== category.password) {
        return NextResponse.json(
          { 
            error: 'Niepoprawne hasło',
            requiresPassword: true 
          },
          { status: 403 }
        );
      }
    }

    // Buduj warunki filtrowania
    const whereConditions: any = {
      categoryId: categoryId
    };

    // Filtruj tylko dokumenty użytkownika jeśli wybrano "moje dokumenty"
    if (onlyMy && session.user?.email) {
      whereConditions.uploadedBy = session.user.email;
    }

    // Dodaj wyszukiwanie po tytule i opisie
    if (search && search.trim()) {
      whereConditions.OR = [
        {
          title: {
            contains: search.trim(),
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search.trim(),
            mode: 'insensitive'
          }
        }
      ];
    }

    // Pobierz dokumenty z bazy danych (TYLKO select, BEZ include)
    const documents = await prisma.knowledgeDocument.findMany({
      where: whereConditions,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        description: true,
        fileType: true,
        fileSize: true,
        originalFileName: true,
        uploadedBy: true,
        uploadedByName: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
        // WAŻNE: Pobierz content dla AI, ale NIE filePath (base64)
        content: true,
        // Wybierz tylko potrzebne pola z kategorii
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`✅ Pobrano ${documents.length} dokumentów`);

    // Przygotuj odpowiedź z dodatkowymi informacjami
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      originalFileName: doc.originalFileName,
      uploadedBy: doc.uploadedByName || doc.uploadedBy,
      uploadedByEmail: doc.uploadedBy,
      categoryId: doc.categoryId,
      categoryName: doc.category.name,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      isOwner: doc.uploadedBy === (session.user?.email || ''),
      // NOWE: Informacja o dostępności contentu
      hasContent: !!doc.content && doc.content.length > 0
    }));

    return NextResponse.json({
      success: true,
      documents: formattedDocuments,
      totalCount: documents.length,
      filters: {
        categoryId,
        onlyMy,
        search
      }
    });

  } catch (error) {
    console.error('❌ Błąd podczas pobierania dokumentów:', error);
    return NextResponse.json(
      { 
        error: 'Wystąpił błąd podczas pobierania dokumentów',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// NOWY endpoint do pobierania konkretnych dokumentów z pełnym contentem
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      );
    }

    const { documentIds, password, categoryPasswords } = await request.json();

    if (!documentIds || !Array.isArray(documentIds)) {
      return NextResponse.json(
        { error: 'Brak listy ID dokumentów' },
        { status: 400 }
      );
    }

    console.log(`📄 Pobieranie ${documentIds.length} dokumentów z pełną zawartością`);

    // Pobierz dokumenty z pełną zawartością (używamy include zamiast select)
    const documents = await prisma.knowledgeDocument.findMany({
      where: {
        id: {
          in: documentIds
        }
      },
      include: {
        category: true
      }
    });

    // Sprawdź dostęp do każdego dokumentu
    const accessibleDocuments = [];
    
    for (const doc of documents) {
      const category = doc.category;
      const isOwner = category.createdBy === session.user.email;
      const isPublic = category.isPublic;

      // Sprawdź podstawowy dostęp
      if (!isPublic && !isOwner) {
        console.log(`❌ Brak dostępu do dokumentu ${doc.id} - prywatna kategoria`);
        continue; // Pomiń ten dokument
      }

      // Sprawdź hasło jeśli wymagane
      if (category.password && !isOwner) {
        const categoryPassword = categoryPasswords?.[category.id] || password;
        
        if (!categoryPassword) {
          console.log(`❌ Brak hasła dla chronionej kategorii ${category.id}`);
          continue; // Pomiń - brak hasła
        }

        const crypto = require('crypto');
        const hashedPassword = crypto.createHash('sha256').update(categoryPassword.trim()).digest('hex');
        
        if (hashedPassword !== category.password) {
          console.log(`❌ Niepoprawne hasło dla kategorii ${category.id}`);
          continue; // Pomiń - złe hasło
        }
      }

      // Dodaj dokument do dostępnych
      accessibleDocuments.push({
        id: doc.id,
        title: doc.title,
        content: doc.content || '',
        fileType: doc.fileType,
        originalFileName: doc.originalFileName,
        categoryName: category.name,
        categoryId: category.id,
        // NOWE: Obsługa base64 dla pobierania plików
        hasFile: doc.filePath && doc.filePath.startsWith('base64:'),
        fileSize: doc.fileSize
      });
    }

    console.log(`✅ Zwracam ${accessibleDocuments.length} dostępnych dokumentów`);

    return NextResponse.json({
      success: true,
      documents: accessibleDocuments,
      requestedCount: documentIds.length,
      accessibleCount: accessibleDocuments.length
    });

  } catch (error) {
    console.error('❌ Błąd podczas pobierania dokumentów z contentem:', error);
    return NextResponse.json(
      { 
        error: 'Wystąpił błąd podczas pobierania dokumentów',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}