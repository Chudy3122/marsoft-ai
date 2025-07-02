// app/api/knowledge/documents/content/route.ts
// 🔥 NAPRAWIONA WERSJA z pełną diagnostyką + OBSŁUGA CHAT DOCUMENTS

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  console.log("🔥 === START content endpoint (UNIFIED VERSION) ===");
  
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

    console.log(`👤 Użytkownik: ${session.user.email} (ID: ${session.user.id})`);

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

    // 🔥 KROK 3A: Pobierz dokumenty z BIBLIOTEKI WIEDZY (KnowledgeDocument)
    console.log(`\n📚 === WYSZUKIWANIE W BIBLIOTECE WIEDZY ===`);
    console.log(`📄 Szukam ${ids.length} dokumentów w tabeli KnowledgeDocument...`);

    const knowledgeDocuments = await prisma.knowledgeDocument.findMany({
      where: {
        id: {
          in: ids
        }
      },
      select: {
        id: true,
        title: true,
        fileType: true,
        content: true,
        originalFileName: true,
        uploadedBy: true,
        uploadedByName: true,
        filePath: true,
        fileSize: true,
        createdAt: true,
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

    console.log(`📚 Znaleziono ${knowledgeDocuments.length} dokumentów w bibliotece wiedzy`);

    // 🔥 KROK 3B: Pobierz dokumenty z CZATÓW (Document)
    console.log(`\n💬 === WYSZUKIWANIE W DOKUMENTACH CZATÓW ===`);
    console.log(`📄 Szukam ${ids.length} dokumentów w tabeli Document...`);

    const chatDocuments = await prisma.document.findMany({
      where: {
        id: {
          in: ids
        },
        chat: {
          userId: session.user.id // Tylko dokumenty z czatów użytkownika
        }
      },
      select: {
        id: true,
        title: true,
        fileType: true,
        content: true,
        pages: true,
        rows: true,
        columns: true,
        metadata: true,
        createdAt: true,
        isDefault: true,
        chat: {
          select: {
            id: true,
            title: true,
            userId: true,
            createdAt: true
          }
        }
      }
    });

    console.log(`💬 Znaleziono ${chatDocuments.length} dokumentów w czatach`);

    // 🔥 KROK 4A: Szczegółowa diagnostyka dokumentów BIBLIOTEKI WIEDZY
    console.log(`\n📚 === DIAGNOSTYKA BIBLIOTEKI WIEDZY ===`);
    for (let i = 0; i < knowledgeDocuments.length; i++) {
      const doc = knowledgeDocuments[i];
      console.log(`\n📋 === DOKUMENT BIBLIOTEKI ${i + 1}/${knowledgeDocuments.length} ===`);
      console.log(`🆔 ID: ${doc.id}`);
      console.log(`📖 Tytuł: "${doc.title}"`);
      console.log(`📁 Typ: ${doc.fileType}`);
      console.log(`📂 Kategoria: ${doc.category.name} (${doc.category.isPublic ? 'publiczna' : 'prywatna'})`);
      console.log(`👤 Właściciel kategorii: ${doc.category.createdBy}`);
      console.log(`👤 Przesłał: ${doc.uploadedBy} (${doc.uploadedByName || 'bez nazwy'})`);
      console.log(`📄 Plik: ${doc.originalFileName}`);
      console.log(`📦 Rozmiar: ${doc.fileSize} bajtów`);
      console.log(`⏰ Utworzono: ${doc.createdAt}`);
      console.log(`🗂️ FilePath: ${doc.filePath?.substring(0, 30)}...`);
      
      // KLUCZOWA DIAGNOSTYKA CONTENT
      console.log(`\n📝 === ANALIZA CONTENT (BIBLIOTEKA) ===`);
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
        
        if (doc.content.includes('**Status:**')) {
          console.log(`   ⚠️ WYKRYTO FALLBACK CONTENT (biblioteka)`);
        } else {
          console.log(`   ✅ Content wygląda normalnie (biblioteka)`);
        }
      } else {
        console.log(`   ❌ BRAK CONTENT! (biblioteka)`);
      }
      
      // Sprawdź dostęp
      const isOwner = doc.category.createdBy === session.user.email;
      const isPublic = doc.category.isPublic;
      const hasPassword = !!doc.category.password;
      
      console.log(`\n🔐 === ANALIZA DOSTĘPU (BIBLIOTEKA) ===`);
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
        hasAccess = false;
        console.log(`   ⚠️ Brak dostępu: publiczna kategoria z hasłem`);
      } else {
        hasAccess = false;
        console.log(`   ❌ Brak dostępu: prywatna kategoria`);
      }
      
      console.log(`   🔑 Końcowy dostęp (biblioteka): ${hasAccess}`);
    }

    // 🔥 KROK 4B: Szczegółowa diagnostyka dokumentów CZATÓW
    console.log(`\n💬 === DIAGNOSTYKA DOKUMENTÓW CZATÓW ===`);
    for (let i = 0; i < chatDocuments.length; i++) {
      const doc = chatDocuments[i];
      console.log(`\n📋 === DOKUMENT CZATU ${i + 1}/${chatDocuments.length} ===`);
      console.log(`🆔 ID: ${doc.id}`);
      console.log(`📖 Tytuł: "${doc.title}"`);
      console.log(`📁 Typ: ${doc.fileType}`);
      console.log(`💬 Czat: "${doc.chat?.title}" (ID: ${doc.chat?.id})`);
      console.log(`👤 Właściciel czatu: ${doc.chat?.userId}`);
      console.log(`📄 Strony: ${doc.pages || 'brak'}`);
      console.log(`📊 Wiersze/Kolumny: ${doc.rows || 'brak'}/${doc.columns || 'brak'}`);
      console.log(`⏰ Utworzono: ${doc.createdAt}`);
      console.log(`🔧 Default: ${doc.isDefault}`);
      console.log(`🗃️ Metadata: ${doc.metadata ? JSON.stringify(doc.metadata).substring(0, 50) + '...' : 'brak'}`);
      
      // KLUCZOWA DIAGNOSTYKA CONTENT
      console.log(`\n📝 === ANALIZA CONTENT (CZAT) ===`);
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
        console.log(`   ✅ Content wygląda normalnie (czat)`);
      } else {
        console.log(`   ❌ BRAK CONTENT! (czat)`);
      }
      
      // Dostęp dla dokumentów czatu
      const hasAccess = doc.chat?.userId === session.user.id;
      console.log(`\n🔐 === ANALIZA DOSTĘPU (CZAT) ===`);
      console.log(`   - użytkownik jest właścicielem czatu: ${hasAccess}`);
      console.log(`   🔑 Końcowy dostęp (czat): ${hasAccess}`);
    }
    
    // 🔥 KROK 5: Połącz i filtruj dokumenty
    console.log(`\n🔗 === ŁĄCZENIE DOKUMENTÓW ===`);
    const accessibleDocuments = [];
    
    // 5A: Przetwórz dokumenty z biblioteki wiedzy
    for (const doc of knowledgeDocuments) {
      const category = doc.category;
      const isOwner = category.createdBy === session.user.email;
      const isPublic = category.isPublic;

      let hasAccess = false;
      if (isOwner) {
        hasAccess = true;
      } else if (isPublic && !category.password) {
        hasAccess = true;
      } else {
        hasAccess = false;
      }

      if (!hasAccess) {
        console.log(`🔒 Pominięto dokument biblioteki ${doc.id} - brak dostępu`);
        continue;
      }

      if (!doc.content || doc.content.trim().length === 0) {
        console.log(`⚠️ Dokument biblioteki ${doc.id} nie ma zawartości`);
        
        accessibleDocuments.push({
          id: doc.id,
          title: doc.title,
          fileType: doc.fileType,
          content: `❌ BRAK ZAWARTOŚCI (BIBLIOTEKA)\n\nDokument "${doc.title}" z biblioteki wiedzy nie ma wyekstraktowanej zawartości.\n\n**ID:** ${doc.id}\n**Kategoria:** ${category.name}\n**Plik:** ${doc.originalFileName}`,
          contentLength: 0,
          categoryName: category.name,
          categoryId: category.id,
          originalFileName: doc.originalFileName,
          uploadedBy: doc.uploadedBy,
          uploadedByName: doc.uploadedByName,
          hasContentIssue: true,
          source: 'knowledge_library',
          debug: {
            contentIsNull: doc.content === null,
            contentIsEmpty: doc.content === '',
            hasFilePath: !!doc.filePath,
            isBase64: doc.filePath?.startsWith('base64:') || false
          }
        });
      } else {
        console.log(`✅ Dokument biblioteki ${doc.id} OK - dodaję do odpowiedzi (${doc.content.length} znaków)`);
        
        accessibleDocuments.push({
          id: doc.id,
          title: doc.title,
          fileType: doc.fileType,
          content: doc.content,
          contentLength: doc.content.length,
          categoryName: category.name,
          categoryId: category.id,
          originalFileName: doc.originalFileName,
          uploadedBy: doc.uploadedBy,
          uploadedByName: doc.uploadedByName,
          hasContentIssue: false,
          source: 'knowledge_library',
          debug: {
            contentLength: doc.content.length,
            isFallback: doc.content.includes('**Status:**'),
            contentPreview: doc.content.substring(0, 100) + '...'
          }
        });
      }
    }

    // 5B: Przetwórz dokumenty z czatów
    for (const doc of chatDocuments) {
      const hasAccess = doc.chat?.userId === session.user.id;

      if (!hasAccess) {
        console.log(`🔒 Pominięto dokument czatu ${doc.id} - brak dostępu`);
        continue;
      }

      if (!doc.content || doc.content.trim().length === 0) {
        console.log(`⚠️ Dokument czatu ${doc.id} nie ma zawartości`);
        
        accessibleDocuments.push({
          id: doc.id,
          title: doc.title,
          fileType: doc.fileType,
          content: `❌ BRAK ZAWARTOŚCI (CZAT)\n\nDokument "${doc.title}" z czatu nie ma wyekstraktowanej zawartości.\n\n**ID:** ${doc.id}\n**Czat:** ${doc.chat?.title}\n**Typ:** ${doc.fileType}`,
          contentLength: 0,
          categoryName: `Czat: ${doc.chat?.title}`,
          categoryId: doc.chat?.id,
          originalFileName: doc.title,
          uploadedBy: session.user.email,
          uploadedByName: session.user.name,
          hasContentIssue: true,
          source: 'chat_document',
          chatInfo: {
            chatId: doc.chat?.id,
            chatTitle: doc.chat?.title,
            pages: doc.pages,
            rows: doc.rows,
            columns: doc.columns
          },
          debug: {
            contentIsNull: doc.content === null,
            contentIsEmpty: doc.content === '',
            hasMetadata: !!doc.metadata,
            isDefault: doc.isDefault
          }
        });
      } else {
        console.log(`✅ Dokument czatu ${doc.id} OK - dodaję do odpowiedzi (${doc.content.length} znaków)`);
        
        accessibleDocuments.push({
          id: doc.id,
          title: doc.title,
          fileType: doc.fileType,
          content: doc.content,
          contentLength: doc.content.length,
          categoryName: `Czat: ${doc.chat?.title}`,
          categoryId: doc.chat?.id,
          originalFileName: doc.title,
          uploadedBy: session.user.email,
          uploadedByName: session.user.name,
          hasContentIssue: false,
          source: 'chat_document',
          chatInfo: {
            chatId: doc.chat?.id,
            chatTitle: doc.chat?.title,
            pages: doc.pages,
            rows: doc.rows,
            columns: doc.columns
          },
          debug: {
            contentLength: doc.content.length,
            hasMetadata: !!doc.metadata,
            isDefault: doc.isDefault,
            contentPreview: doc.content.substring(0, 100) + '...'
          }
        });
      }
    }

    // 6. Przygotuj statystyki
    const totalContentLength = accessibleDocuments.reduce((sum, doc) => sum + doc.contentLength, 0);
    const documentsWithContent = accessibleDocuments.filter(doc => !doc.hasContentIssue).length;
    const documentsWithIssues = accessibleDocuments.filter(doc => doc.hasContentIssue).length;
    const knowledgeDocsCount = accessibleDocuments.filter(doc => doc.source === 'knowledge_library').length;
    const chatDocsCount = accessibleDocuments.filter(doc => doc.source === 'chat_document').length;
    
    console.log(`\n📊 === FINALNE PODSUMOWANIE (UNIFIED) ===`);
    console.log(`   📄 Żądanych dokumentów: ${ids.length}`);
    console.log(`   🔍 Znalezionych w bibliotece: ${knowledgeDocuments.length}`);
    console.log(`   🔍 Znalezionych w czatach: ${chatDocuments.length}`);
    console.log(`   🔍 Łącznie znalezionych: ${knowledgeDocuments.length + chatDocuments.length}`);
    console.log(`   🔓 Dostępnych dla użytkownika: ${accessibleDocuments.length}`);
    console.log(`   📚 Z biblioteki wiedzy: ${knowledgeDocsCount}`);
    console.log(`   💬 Z czatów: ${chatDocsCount}`);
    console.log(`   ✅ Z prawidłową zawartością: ${documentsWithContent}`);
    console.log(`   ❌ Z problemami zawartości: ${documentsWithIssues}`);
    console.log(`   📏 Łączna długość zawartości: ${totalContentLength} znaków`);

    // 7. Próbka zawartości dla debugowania
    accessibleDocuments.forEach((doc, index) => {
      if (doc.content && !doc.hasContentIssue && index < 3) {
        console.log(`📖 Próbka ${index + 1} (${doc.source}). "${doc.title}": "${doc.content.substring(0, 100)}..."`);
      }
    });

    const response = {
      success: true,
      documents: accessibleDocuments,
      totalDocuments: accessibleDocuments.length,
      totalContentLength: totalContentLength,
      stats: {
        requested: ids.length,
        foundKnowledge: knowledgeDocuments.length,
        foundChat: chatDocuments.length,
        foundTotal: knowledgeDocuments.length + chatDocuments.length,
        accessible: accessibleDocuments.length,
        fromKnowledge: knowledgeDocsCount,
        fromChat: chatDocsCount,
        withContent: documentsWithContent,
        withIssues: documentsWithIssues
      },
      debug: {
        sessionUser: session.user.email,
        sessionUserId: session.user.id,
        requestedIds: ids,
        timestamp: new Date().toISOString(),
        version: 'unified-v1'
      }
    };

    console.log("🔥 === END content endpoint SUCCESS (UNIFIED) ===");
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ === content endpoint ERROR (UNIFIED) ===');
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
          errorType: error instanceof Error ? error.name : typeof error,
          version: 'unified-v1'
        }
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
    console.log("🔥 === END content endpoint (finally) (UNIFIED) ===");
  }
}