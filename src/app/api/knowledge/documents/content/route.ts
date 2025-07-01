// app/api/knowledge/documents/content/route.ts
// 🔥 NAPRAWIONA WERSJA z pełną diagnostyką

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  console.log("🔥 === START content endpoint ===");
  
  try {
    // 1. Sprawdź autoryzację
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      console.log("❌ Brak autoryzacji");
      return NextResponse.json(
        { error: 'Brak autoryzacji' },
        { status: 401 }
      );
    }

    console.log(`👤 Użytkownik: ${session.user.email}`);

    // 2. Pobierz parametry
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
    console.log(`📋 Przetwarzane IDs (${ids.length}):`, ids);
    
    if (ids.length === 0) {
      console.log("⚠️ Lista IDs jest pusta po filtrowaniu");
      return NextResponse.json({ 
        success: true,
        documents: [],
        totalDocuments: 0,
        totalContentLength: 0,
        message: 'Brak prawidłowych ID dokumentów'
      });
    }

    // 3. Pobierz dokumenty z bazy danych
    console.log(`📄 Szukam ${ids.length} dokumentów w bazie danych...`);

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
        content: true, // 🔥 NAJWAŻNIEJSZE POLE
        originalFileName: true,
        uploadedBy: true,
        filePath: true, // 🔥 Dla diagnostyki
        fileSize: true, // 🔥 Dla diagnostyki
        createdAt: true, // 🔥 Dla diagnostyki
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
    
    // 4. Szczegółowa diagnostyka każdego dokumentu
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      console.log(`\n📋 === DOKUMENT ${i + 1}/${documents.length} ===`);
      console.log(`🆔 ID: ${doc.id}`);
      console.log(`📖 Tytuł: "${doc.title}"`);
      console.log(`📁 Typ: ${doc.fileType}`);
      console.log(`📂 Kategoria: ${doc.category.name} (${doc.category.isPublic ? 'publiczna' : 'prywatna'})`);
      console.log(`👤 Właściciel kategorii: ${doc.category.createdBy}`);
      console.log(`📄 Plik: ${doc.originalFileName}`);
      console.log(`📦 Rozmiar: ${doc.fileSize} bajtów`);
      console.log(`⏰ Utworzono: ${doc.createdAt}`);
      console.log(`🗂️ FilePath: ${doc.filePath?.substring(0, 30)}...`);
      
      // 🔥 KLUCZOWA DIAGNOSTYKA CONTENT
      console.log(`\n📝 === ANALIZA CONTENT ===`);
      console.log(`   - content nie jest null: ${doc.content !== null}`);
      console.log(`   - content nie jest undefined: ${doc.content !== undefined}`);
      console.log(`   - content istnieje: ${!!doc.content}`);
      console.log(`   - content nie jest pustym stringiem: ${doc.content !== ''}`);
      console.log(`   - długość content: ${doc.content?.length || 0} znaków`);
      
      if (doc.content) {
        console.log(`   - typ content: ${typeof doc.content}`);
        console.log(`   - długość po trim: ${doc.content.trim().length}`);
        console.log(`   - pierwszy znak: "${doc.content.charAt(0)}" (kod: ${doc.content.charCodeAt(0)})`);
        console.log(`   - początek content: "${doc.content.substring(0, 50)}..."`);
        
        // Sprawdź czy to fallback content
        if (doc.content.includes('**Status:**')) {
          console.log(`   ⚠️ WYKRYTO FALLBACK CONTENT`);
          if (doc.content.includes('Błąd ekstrakcji')) {
            console.log(`   ❌ Content z błędem ekstrakcji`);
          } else if (doc.content.includes('PDF skanowany')) {
            console.log(`   📷 PDF skanowany (obrazkowy)`);
          }
        } else {
          console.log(`   ✅ Content wygląda normalnie`);
        }
      } else {
        console.log(`   ❌ BRAK CONTENT!`);
        
        // Sprawdź czy można odzyskać z base64
        if (doc.filePath?.startsWith('base64:')) {
          console.log(`   💾 Ma dane base64 - można spróbować odzyskać`);
        } else {
          console.log(`   💾 Brak danych base64 - nie można odzyskać`);
        }
      }
      
      // Sprawdź dostęp
      const isOwner = doc.category.createdBy === session.user.email;
      const isPublic = doc.category.isPublic;
      const hasPassword = !!doc.category.password;
      
      console.log(`\n🔐 === ANALIZA DOSTĘPU ===`);
      console.log(`   - użytkownik jest właścicielem kategorii: ${isOwner}`);
      console.log(`   - kategoria jest publiczna: ${isPublic}`);
      console.log(`   - kategoria ma hasło: ${hasPassword}`);
      
      let hasAccess = false;
      if (isOwner) {
        hasAccess = true;
        console.log(`   ✅ Dostęp: właściciel kategorii`);
      } else if (isPublic && !hasPassword) {
        hasAccess = true;
        console.log(`   ✅ Dostęp: publiczna kategoria bez hasła`);
      } else if (isPublic && hasPassword) {
        hasAccess = false; // Wymagane sprawdzenie hasła
        console.log(`   ⚠️ Brak dostępu: publiczna kategoria z hasłem (wymagane hasło)`);
      } else {
        hasAccess = false;
        console.log(`   ❌ Brak dostępu: prywatna kategoria`);
      }
      
      console.log(`   🔑 Końcowy dostęp: ${hasAccess}`);
    }
    
    if (documents.length === 0) {
      console.log("⚠️ Nie znaleziono żadnych dokumentów dla podanych ID");
      return NextResponse.json({
        success: true,
        documents: [],
        totalDocuments: 0,
        totalContentLength: 0,
        message: 'Nie znaleziono dokumentów dla podanych ID',
        debug: { requestedIds: ids }
      });
    }

    // 5. Filtruj dokumenty na które użytkownik ma dostęp
    const accessibleDocuments = [];
    
    for (const doc of documents) {
      const category = doc.category;
      const isOwner = category.createdBy === session.user.email;
      const isPublic = category.isPublic;

      // Sprawdź podstawowy dostęp
      let hasAccess = false;
      
      if (isOwner) {
        hasAccess = true;
      } else if (isPublic && !category.password) {
        hasAccess = true;
      } else if (isPublic && category.password) {
        // TODO: Implementuj sprawdzanie haseł
        hasAccess = false;
      } else {
        hasAccess = false;
      }

      if (!hasAccess) {
        console.log(`🔒 Pominięto dokument ${doc.id} - brak dostępu`);
        continue;
      }

      // 🔥 SPRAWDŹ CONTENT I PRZYGOTUJ RESPONSE
      if (!doc.content || doc.content.trim().length === 0) {
        console.log(`⚠️ Dokument ${doc.id} nie ma zawartości`);
        
        // Dodaj dokument z informacją o problemie
        accessibleDocuments.push({
          id: doc.id,
          title: doc.title,
          fileType: doc.fileType,
          content: `❌ BRAK ZAWARTOŚCI\n\nDokument "${doc.title}" nie ma wyekstraktowanej zawartości.\n\n**Możliwe przyczyny:**\n- Błąd podczas uploadu\n- PDF skanowany (obrazkowy)\n- Uszkodzony plik\n- Problem z ekstrakcją tekstu\n\n**Rozwiązanie:**\n1. Spróbuj przesłać plik ponownie\n2. Sprawdź czy plik nie jest uszkodzony\n3. Jeśli to PDF skanowany, użyj programu OCR\n\n**ID dokumentu:** ${doc.id}\n**Plik:** ${doc.originalFileName}\n**Rozmiar:** ${doc.fileSize} bajtów`,
          contentLength: 0,
          categoryName: category.name,
          categoryId: category.id,
          originalFileName: doc.originalFileName,
          hasContentIssue: true,
          debug: {
            contentIsNull: doc.content === null,
            contentIsEmpty: doc.content === '',
            hasFilePath: !!doc.filePath,
            isBase64: doc.filePath?.startsWith('base64:') || false
          }
        });
      } else {
        console.log(`✅ Dokument ${doc.id} OK - dodaję do odpowiedzi (${doc.content.length} znaków)`);
        
        accessibleDocuments.push({
          id: doc.id,
          title: doc.title,
          fileType: doc.fileType,
          content: doc.content,
          contentLength: doc.content.length,
          categoryName: category.name,
          categoryId: category.id,
          originalFileName: doc.originalFileName,
          hasContentIssue: false,
          debug: {
            contentLength: doc.content.length,
            isFallback: doc.content.includes('**Status:**'),
            contentPreview: doc.content.substring(0, 100) + '...'
          }
        });
      }
    }

    // 6. Przygotuj statystyki
    const totalContentLength = accessibleDocuments.reduce((sum, doc) => sum + doc.contentLength, 0);
    const documentsWithContent = accessibleDocuments.filter(doc => !doc.hasContentIssue).length;
    const documentsWithIssues = accessibleDocuments.filter(doc => doc.hasContentIssue).length;
    
    console.log(`\n📊 === FINALNE PODSUMOWANIE ===`);
    console.log(`   📄 Żądanych dokumentów: ${ids.length}`);
    console.log(`   🔍 Znalezionych w bazie: ${documents.length}`);
    console.log(`   🔓 Dostępnych dla użytkownika: ${accessibleDocuments.length}`);
    console.log(`   ✅ Z prawidłową zawartością: ${documentsWithContent}`);
    console.log(`   ❌ Z problemami zawartości: ${documentsWithIssues}`);
    console.log(`   📏 Łączna długość zawartości: ${totalContentLength} znaków`);

    // 7. Próbka zawartości dla debugowania
    accessibleDocuments.forEach((doc, index) => {
      if (doc.content && !doc.hasContentIssue && index < 3) {
        console.log(`📖 Próbka ${index + 1}. "${doc.title}": "${doc.content.substring(0, 100)}..."`);
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
      },
      debug: {
        sessionUser: session.user.email,
        requestedIds: ids,
        timestamp: new Date().toISOString()
      }
    };

    console.log("🔥 === END content endpoint SUCCESS ===");
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ === content endpoint ERROR ===');
    console.error('❌ Szczegóły błędu:', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : 'No stack trace'
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Wystąpił błąd podczas pobierania zawartości dokumentów',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
        debug: {
          timestamp: new Date().toISOString(),
          errorType: error instanceof Error ? error.name : typeof error
        }
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
    console.log("🔥 === END content endpoint (finally) ===");
  }
}