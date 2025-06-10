// app/api/knowledge/categories/[id]/verify-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
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
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Hasło jest wymagane' },
        { status: 400 }
      );
    }

    console.log(`🔐 Weryfikacja hasła dla kategorii ${categoryId} przez ${session.user.email}`);

    // Pobierz kategorię
    const category = await prisma.knowledgeCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Kategoria nie została znaleziona' },
        { status: 404 }
      );
    }

    // Sprawdź czy kategoria ma hasło
    if (!category.password) {
      return NextResponse.json({
        success: true,
        message: 'Kategoria nie jest chroniona hasłem'
      });
    }

    // Hashuj podane hasło i porównaj
    const crypto = require('crypto');
    const hashedPassword = crypto.createHash('sha256').update(password.trim()).digest('hex');

    if (hashedPassword !== category.password) {
      console.log(`❌ Niepoprawne hasło dla kategorii ${categoryId}`);
      return NextResponse.json(
        { error: 'Niepoprawne hasło' },
        { status: 403 }
      );
    }

    console.log(`✅ Poprawne hasło dla kategorii ${categoryId}`);

    return NextResponse.json({
      success: true,
      message: 'Hasło poprawne - dostęp przyznany'
    });

  } catch (error) {
    console.error('❌ Błąd podczas weryfikacji hasła:', error);
    return NextResponse.json(
      { 
        error: 'Wystąpił błąd podczas weryfikacji hasła',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  }
}