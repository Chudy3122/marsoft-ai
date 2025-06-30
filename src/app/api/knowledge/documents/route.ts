// app/api/knowledge/documents/route.ts - NAPRAWIONA WERSJA
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

    console.log(`📚 GET /documents - kategoria: ${categoryId}, tylko moje: ${onlyMy}, wyszukiwanie: ${search || 'brak'}`);

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Brak wymaganego parametru categoryId' },
        { status: 400 }
      );
    }

    // Sprawdź dostęp do kategorii
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

    // Pobierz dokumenty z bazy danych
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
        // 🔥 DODAJ INFO O ZAWARTOŚCI
        content: true, // Potrzebne do sprawdzenia czy ma zawartość
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`✅ Pobrano ${documents.length} dokumentów dla kategorii ${categoryId}`);

    // Przygotuj odpowiedź z dodatkowymi informacjami diagnostycznymi
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
      // 🔥 DIAGNOSTYKA ZAWARTOŚCI
      hasContent: !!doc.content && doc.content.trim().length > 0,
      contentLength: doc.content?.length || 0,
      contentPreview: doc.content ? doc.content.substring(0, 100) + '...' : null
    }));

    // Statystyki dla diagnostyki
    const stats = {
      total: documents.length,
      withContent: formattedDocuments.filter(d => d.hasContent).length,
      withoutContent: formattedDocuments.filter(d => !d.hasContent).length,
      averageContentLength: formattedDocuments.length > 0 
        ? Math.round(formattedDocuments.reduce((sum, doc) => sum + doc.contentLength, 0) / formattedDocuments.length)
        : 0
    };

    console.log(`📊 Statystyki dokumentów:`, stats);

    return NextResponse.json({
      success: true,
      documents: formattedDocuments,
      totalCount: documents.length,
      stats: stats,
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

// 🔥 NOWY UPROSZCZONY ENDPOINT DO POBIERANIA ZAWARTOŚCI
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      );
    }

    const { documentIds } = await request.json();

    if (!documentIds || !Array.isArray(documentIds)) {
      return NextResponse.json(
        { error: 'Brak listy ID dokumentów' },
        { status: 400 }
      );
    }

    console.log(`📄 POST /documents - pobieranie zawartości dla ${documentIds.length} dokumentów`);

    // Pobierz dokumenty z pełną zawartością
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

    console.log(`📚 Znaleziono ${documents.length} dokumentów w bazie danych`);

    // Sprawdź dostęp do każdego dokumentu
    const accessibleDocuments = [];
    
    for (const doc of documents) {
      const category = doc.category;
      const isOwner = category.createdBy === session.user.email;
      const isPublic = category.isPublic;

      console.log(`🔐 Sprawdzam dostęp do dokumentu ${doc.id} (${doc.title}):`);
      console.log(`   - Kategoria: ${category.name} (${isPublic ? 'publiczna' : 'prywatna'})`);
      console.log(`   - Właściciel: ${isOwner}`);
      console.log(`   - Ma zawartość: ${!!doc.content} (${doc.content?.length || 0} znaków)`);

      // Sprawdź podstawowy dostęp (uproszczony - bez haseł na razie)
      if (!isPublic && !isOwner) {
        console.log(`   ❌ Brak dostępu - prywatna kategoria`);
        continue;
      }

      // Na razie pomiń kategorie z hasłami dla nie-właścicieli
      if (category.password && !isOwner) {
        console.log(`   ⚠️ Pomijam - kategoria z hasłem (do implementacji)`);
        continue;
      }

      console.log(`   ✅ Dostęp przyznany`);

      // Dodaj dokument do dostępnych
      accessibleDocuments.push({
        id: doc.id,
        title: doc.title,
        content: doc.content || `BRAK ZAWARTOŚCI: Dokument "${doc.title}" nie ma wyekstraktowanej zawartości.`,
        fileType: doc.fileType,
        originalFileName: doc.originalFileName,
        categoryName: category.name,
        categoryId: category.id,
        hasContent: !!doc.content && doc.content.trim().length > 0,
        contentLength: doc.content?.length || 0
      });
    }

    const totalContentLength = accessibleDocuments.reduce((sum, doc) => sum + doc.contentLength, 0);
    const documentsWithContent = accessibleDocuments.filter(doc => doc.hasContent).length;

    console.log(`✅ Zwracam ${accessibleDocuments.length} dostępnych dokumentów:`);
    console.log(`   - Z zawartością: ${documentsWithContent}`);
    console.log(`   - Łączna długość: ${totalContentLength} znaków`);

    return NextResponse.json({
      success: true,
      documents: accessibleDocuments,
      stats: {
        requested: documentIds.length,
        found: documents.length,
        accessible: accessibleDocuments.length,
        withContent: documentsWithContent,
        totalContentLength: totalContentLength
      }
    });

  } catch (error) {
    console.error('❌ Błąd podczas pobierania zawartości dokumentów:', error);
    return NextResponse.json(
      { 
        error: 'Wystąpił błąd podczas pobierania zawartości dokumentów',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}