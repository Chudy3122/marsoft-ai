// src/app/api/knowledge/documents/content/route.ts
// DODAJ WIĘCEJ DEBUGOWANIA

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  console.log("🔥 === START content endpoint ===");
  
  try {
    // Sprawdź autoryzację
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      console.log("❌ Brak autoryzacji");
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      );
    }

    console.log(`👤 Użytkownik: ${session.user.email}`);

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    
    console.log(`📥 Otrzymany parametr ids: "${idsParam}"`);
    
    if (!idsParam) {
      console.log("❌ Brak parametru ids");
      return NextResponse.json(
        { error: 'Brak parametru ids' },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',').filter(id => id.trim().length > 0);
    
    console.log(`📋 Przetwarzane IDs:`, ids);
    
    if (ids.length === 0) {
      console.log("⚠️ Lista IDs jest pusta po filtrowaniu");
      return NextResponse.json({ documents: [] });
    }

    console.log(`📄 Szukam ${ids.length} dokumentów w bazie danych...`);

    // Pobierz dokumenty z pełną zawartością
    const documents = await prisma.knowledgeDocument.findMany({
      where: {
        id: {
          in: ids
        }
      },
      include: {
        category: true
      }
    });

    console.log(`📚 Znaleziono ${documents.length} dokumentów w bazie danych`);
    
    // Debug: Wypisz informacje o każdym znalezionym dokumencie
    documents.forEach((doc, index) => {
      console.log(`   ${index + 1}. Dokument ${doc.id}:`);
      console.log(`      - Tytuł: "${doc.title}"`);
      console.log(`      - Kategoria: "${doc.category.name}" (${doc.category.isPublic ? 'publiczna' : 'prywatna'})`);
      console.log(`      - Utworzony przez: ${doc.category.createdBy}`);
      console.log(`      - Ma content: ${!!doc.content}`);
      console.log(`      - Długość content: ${doc.content?.length || 0} znaków`);
      console.log(`      - Ma hasło: ${!!doc.category.password}`);
    });

    // Sprawdź dostęp do każdego dokumentu i przygotuj odpowiedź
    const accessibleDocuments = [];
    
    for (const doc of documents) {
      const category = doc.category;
      const isOwner = category.createdBy === session.user.email;
      const isPublic = category.isPublic;

      console.log(`🔐 Sprawdzam dostęp do dokumentu ${doc.id}:`);
      console.log(`   - isOwner: ${isOwner}`);
      console.log(`   - isPublic: ${isPublic}`);

      // Sprawdź podstawowy dostęp do kategorii
      if (!isPublic && !isOwner) {
        console.log(`❌ Brak dostępu do dokumentu ${doc.id} - prywatna kategoria, nie jesteś właścicielem`);
        continue;
      }

      // TODO: Sprawdź hasło kategorii jeśli wymagane
      if (category.password && !isOwner) {
        console.log(`⚠️ Dokument ${doc.id} wymaga hasła, ale nie sprawdzam go na tym endpoincie`);
        // Na razie pomijamy dokumenty chronione hasłem dla nie-właścicieli
        // Możesz dodać obsługę hasła jeśli potrzebna
        continue;
      }

      console.log(`✅ Dostęp do dokumentu ${doc.id} przyznany`);

      accessibleDocuments.push({
        id: doc.id,
        title: doc.title,
        fileType: doc.fileType,
        content: doc.content || '', // 🔥 GŁÓWNE: Zwracamy zawartość
        contentLength: (doc.content || '').length,
        categoryName: doc.category.name,
        categoryId: doc.category.id
      });
    }

    console.log(`✅ Przygotowano ${accessibleDocuments.length} dostępnych dokumentów`);
    
    // Debug: Wypisz informacje o dokumentach do zwrócenia
    accessibleDocuments.forEach((doc, index) => {
      console.log(`   📄 ${index + 1}. "${doc.title}" (${doc.fileType}): ${doc.contentLength} znaków`);
      if (doc.content) {
        console.log(`      Początek treści: "${doc.content.substring(0, 100)}..."`);
      }
    });

    const totalContentLength = accessibleDocuments.reduce((sum, doc) => sum + doc.contentLength, 0);
    console.log(`📊 Łączna długość zawartości: ${totalContentLength} znaków`);

    const response = {
      success: true,
      documents: accessibleDocuments,
      totalDocuments: accessibleDocuments.length,
      totalContentLength: totalContentLength
    };

    console.log("🔥 === END content endpoint SUCCESS ===");
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ === content endpoint ERROR ===');
    console.error('❌ Błąd podczas pobierania zawartości dokumentów:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'Brak stack trace');
    
    return NextResponse.json(
      { 
        error: 'Wystąpił błąd podczas pobierania zawartości dokumentów',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
    console.log("🔥 === END content endpoint (finally) ===");
  }
}