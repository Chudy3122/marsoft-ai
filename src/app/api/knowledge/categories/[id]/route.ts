// app/api/knowledge/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { unlink } from 'fs/promises';

const prisma = new PrismaClient();

// Usuwanie kategorii
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sprawdź autoryzację
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      );
    }

    const categoryId = params.id;

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Brak ID kategorii' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Próba usunięcia kategorii ${categoryId} przez ${session.user.email}`);

    // Znajdź kategorię
    const category = await prisma.knowledgeCategory.findUnique({
      where: { id: categoryId },
      include: {
        documents: true
      }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Kategoria nie została znaleziona' },
        { status: 404 }
      );
    }

    // Sprawdź czy użytkownik jest właścicielem kategorii
    if (category.createdBy !== session.user.email) {
      return NextResponse.json(
        { error: 'Nie masz uprawnień do usunięcia tej kategorii' },
        { status: 403 }
      );
    }

    // Sprawdź czy kategoria zawiera dokumenty
    if (category.documents.length > 0) {
      return NextResponse.json(
        { 
          error: `Nie można usunąć kategorii. Zawiera ona ${category.documents.length} dokumentów. Najpierw usuń wszystkie dokumenty z tej kategorii.`,
          documentsCount: category.documents.length
        },
        { status: 400 }
      );
    }

    // Usuń kategorię z bazy danych
    await prisma.knowledgeCategory.delete({
      where: { id: categoryId }
    });

    console.log(`✅ Kategoria ${categoryId} została usunięta`);

    return NextResponse.json({
      success: true,
      message: 'Kategoria została pomyślnie usunięta'
    });

  } catch (error) {
    console.error('❌ Błąd podczas usuwania kategorii:', error);
    return NextResponse.json(
      { 
        error: 'Wystąpił błąd podczas usuwania kategorii',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  }
}

// Pobieranie szczegółów kategorii
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sprawdź autoryzację
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      );
    }

    const categoryId = params.id;

    const category = await prisma.knowledgeCategory.findUnique({
      where: { id: categoryId },
      include: {
        documents: {
          select: {
            id: true,
            title: true,
            fileType: true,
            fileSize: true,
            createdAt: true
          }
        }
      }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Kategoria nie została znaleziona' },
        { status: 404 }
      );
    }

    // Sprawdź dostęp do kategorii
    if (!category.isPublic && category.createdBy !== session.user.email) {
      return NextResponse.json(
        { error: 'Nie masz dostępu do tej kategorii' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        isPublic: category.isPublic,
        hasPassword: !!category.password,
        createdBy: category.createdByName || category.createdBy,
        isOwner: category.createdBy === session.user.email,
        documentsCount: category.documents.length,
        documents: category.documents,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }
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