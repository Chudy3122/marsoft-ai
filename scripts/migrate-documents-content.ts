// scripts/migrate-documents-content.ts
import { PrismaClient } from '@prisma/client';
import pdfParse from 'pdf-parse';
import XLSX from 'xlsx';
import mammoth from 'mammoth';

const prisma = new PrismaClient();

async function extractTextFromPDF(base64: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const pdfData = await pdfParse(buffer);
    return pdfData.text || '';
  } catch (error) {
    console.error('Błąd podczas ekstrakcji tekstu z PDF:', error);
    return '';
  }
}

async function extractTextFromExcel(base64: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    let extractedText = '';
    
    workbook.SheetNames.forEach((sheetName) => {
      extractedText += `\n### Arkusz: ${sheetName}\n`;
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      extractedText += csv + '\n';
    });
    
    return extractedText;
  } catch (error) {
    console.error('Błąd podczas ekstrakcji tekstu z Excel:', error);
    return '';
  }
}

async function extractTextFromWord(base64: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (error) {
    console.error('Błąd podczas ekstrakcji tekstu z Word:', error);
    return '';
  }
}

async function migrateDocuments() {
  console.log('🚀 Rozpoczynam migrację dokumentów...');
  
  try {
    // Pobierz wszystkie dokumenty które mają placeholder jako content
    const documents = await prisma.knowledgeDocument.findMany({
      where: {
        OR: [
          { content: { startsWith: 'PDF Document:' } },
          { content: { startsWith: 'Excel Document:' } },
          { content: { startsWith: 'Word Document:' } },
          { content: { startsWith: 'Dokument:' } }
        ]
      }
    });
    
    console.log(`📄 Znaleziono ${documents.length} dokumentów do migracji`);
    
    for (const doc of documents) {
      console.log(`\n🔄 Przetwarzam dokument: ${doc.title} (${doc.id})`);
      
      if (!doc.filePath || !doc.filePath.startsWith('base64:')) {
        console.log('❌ Brak danych base64 dla dokumentu');
        continue;
      }
      
      const base64Data = doc.filePath.substring(7); // Usuń "base64:" prefix
      let extractedText = '';
      
      try {
        if (doc.fileType === 'pdf') {
          extractedText = await extractTextFromPDF(base64Data);
        } else if (doc.fileType === 'excel') {
          extractedText = await extractTextFromExcel(base64Data);
        } else if (doc.fileType === 'txt') {
          const buffer = Buffer.from(base64Data, 'base64');
          extractedText = buffer.toString('utf-8');
        } else if (doc.fileType === 'word') {
          extractedText = await extractTextFromWord(base64Data);
        }
        
        if (extractedText && extractedText.length > 0) {
          // Zaktualizuj dokument
          await prisma.knowledgeDocument.update({
            where: { id: doc.id },
            data: { content: extractedText }
          });
          
          console.log(`✅ Zaktualizowano dokument - wyekstrahowano ${extractedText.length} znaków`);
        } else {
          console.log('⚠️ Nie udało się wyekstrahować tekstu');
        }
        
      } catch (error) {
        console.error(`❌ Błąd podczas przetwarzania dokumentu ${doc.id}:`, error);
      }
    }
    
    console.log('\n✅ Migracja zakończona!');
    
  } catch (error) {
    console.error('❌ Błąd podczas migracji:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Uruchom migrację
migrateDocuments();