// app/api/knowledge/documents/route.ts
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

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Brak wymaganego parametru categoryId' },
        { status: 400 }
      );
    }

    console.log(`📚 Pobieranie dokumentów - kategoria: ${categoryId}, tylko moje: ${onlyMy}, wyszukiwanie: ${search || 'brak'}`);

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
      include: {
        category: true
      },
      orderBy: {
        createdAt: 'desc' // Najnowsze dokumenty na górze
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
      uploadedBy: doc.uploadedByName || doc.uploadedBy,
      uploadedByEmail: doc.uploadedBy,
      categoryId: doc.categoryId,
      categoryName: doc.category.name,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      isOwner: doc.uploadedBy === (session.user?.email || '') // Czy użytkownik jest właścicielem
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
  }
}