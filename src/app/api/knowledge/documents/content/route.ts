// app/api/knowledge/documents/content/route.ts
// 🔥 NAPRAWIONA WERSJA - uproszczona i bardziej niezawodna

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
      return NextResponse.json({ 
        success: true,
        documents: [],
        totalDocuments: 0,
        totalContentLength: 0
      });
    }

    console.log(`📄 Szukam ${ids.length} dokumentów w bazie danych...`);

    // 🔥 UPROSZCZONE ZAPYTANIE - pobierz wszystko potrzebne za jednym razem
    const documents = await prisma.knowledgeDocument.findMany({
      where: {
        id: {
          in: ids
        }
      },
      select: {
        id: true,
        title: true,
        fileType: true,
        content: true, // 🔥 Najważniejsze - zawartość dokumentu
        originalFileName: true,
        uploadedBy: true,
        category: {
          select: {
            id: true,
            name: true,
            isPublic: true,
            password: true,
            createdBy: true
          }
        }
      }
    });

    console.log(`📚 Znaleziono ${documents.length} dokumentów w bazie danych`);
    
    if (documents.length === 0) {
      console.log("⚠️ Nie znaleziono żadnych dokumentów dla podanych ID");
      return NextResponse.json({
        success: true,
        documents: [],
        totalDocuments: 0,
        totalContentLength: 0,
        warning: 'Nie znaleziono dokumentów dla podanych ID'
      });
    }

    // 🔥 UPROSZCZONA LOGIKA DOSTĘPU - mniej restrykcyjna na początek
    const accessibleDocuments = [];
    
    for (const doc of documents) {
      const category = doc.category;
      const isOwner = category.createdBy === session.user.email;
      const isPublic = category.isPublic;

      console.log(`🔐 Dokument ${doc.id} (${doc.title}):`);
      console.log(`   - Kategoria: ${category.name} (${isPublic ? 'publiczna' : 'prywatna'})`);
      console.log(`   - isOwner: ${isOwner}`);
      console.log(`   - Ma zawartość: ${!!doc.content} (${doc.content?.length || 0} znaków)`);

      // 🔥 UPROSZCZONA LOGIKA - na początek pozwól na dostęp do publicznych kategorii
      let hasAccess = false;
      
      if (isOwner) {
        hasAccess = true;
        console.log(`   ✅ Dostęp: właściciel kategorii`);
      } else if (isPublic && !category.password) {
        hasAccess = true;
        console.log(`   ✅ Dostęp: publiczna kategoria bez hasła`);
      } else if (isPublic && category.password) {
        // TODO: Na razie pomiń hasła - będziemy to naprawiać osobno
        hasAccess = false;
        console.log(`   ⚠️ Pominięto: publiczna kategoria z hasłem (do naprawy)`);
      } else {
        hasAccess = false;
        console.log(`   ❌ Brak dostępu: prywatna kategoria`);
      }

      if (!hasAccess) {
        continue;
      }

      // 🔥 SPRAWDŹ CZY DOKUMENT MA ZAWARTOŚĆ
      if (!doc.content || doc.content.trim().length === 0) {
        console.log(`   ⚠️ PROBLEM: Dokument ${doc.id} nie ma zawartości lub jest pusta!`);
        // Dodaj dokument z informacją o problemie
        accessibleDocuments.push({
          id: doc.id,
          title: doc.title,
          fileType: doc.fileType,
          content: `BRAK ZAWARTOŚCI: Dokument "${doc.title}" nie ma wyekstraktowanej zawartości. Możliwe przyczyny: błąd podczas uploadu, PDF skanowany, lub problem z ekstrakcją tekstu.`,
          contentLength: 0,
          categoryName: category.name,
          categoryId: category.id,
          originalFileName: doc.originalFileName,
          hasContentIssue: true
        });
      } else {
        console.log(`   ✅ Dokument OK - dodaję do odpowiedzi`);
        accessibleDocuments.push({
          id: doc.id,
          title: doc.title,
          fileType: doc.fileType,
          content: doc.content,
          contentLength: doc.content.length,
          categoryName: category.name,
          categoryId: category.id,
          originalFileName: doc.originalFileName,
          hasContentIssue: false
        });
      }
    }

    console.log(`✅ Przygotowano ${accessibleDocuments.length} dostępnych dokumentów`);
    
    // 🔥 SZCZEGÓŁOWE LOGOWANIE WYNIKÓW
    const totalContentLength = accessibleDocuments.reduce((sum, doc) => sum + doc.contentLength, 0);
    const documentsWithContent = accessibleDocuments.filter(doc => !doc.hasContentIssue).length;
    const documentsWithIssues = accessibleDocuments.filter(doc => doc.hasContentIssue).length;
    
    console.log(`📊 PODSUMOWANIE:`);
    console.log(`   - Żądanych dokumentów: ${ids.length}`);
    console.log(`   - Znalezionych w bazie: ${documents.length}`);
    console.log(`   - Dostępnych dla użytkownika: ${accessibleDocuments.length}`);
    console.log(`   - Z prawidłową zawartością: ${documentsWithContent}`);
    console.log(`   - Z problemami zawartości: ${documentsWithIssues}`);
    console.log(`   - Łączna długość zawartości: ${totalContentLength} znaków`);

    // Wypisz pierwszy fragment zawartości dla debugowania
    accessibleDocuments.forEach((doc, index) => {
      if (doc.content && !doc.hasContentIssue) {
        console.log(`📄 ${index + 1}. "${doc.title}": "${doc.content.substring(0, 100)}..."`);
      }
    });

    const response = {
      success: true,
      documents: accessibleDocuments,
      totalDocuments: accessibleDocuments.length,
      totalContentLength: totalContentLength,
      stats: {
        requested: ids.length,
        found: documents.length,
        accessible: accessibleDocuments.length,
        withContent: documentsWithContent,
        withIssues: documentsWithIssues
      }
    };

    console.log("🔥 === END content endpoint SUCCESS ===");
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ === content endpoint ERROR ===');
    console.error('❌ Błąd podczas pobierania zawartości dokumentów:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'Brak stack trace');
    
    return NextResponse.json(
      { 
        success: false,
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