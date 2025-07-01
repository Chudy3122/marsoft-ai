// scripts/migrate-documents-content.ts
import { PrismaClient } from '@prisma/client';
import pdfParse from 'pdf-parse';
import XLSX from 'xlsx';
import mammoth from 'mammoth';

const prisma = new PrismaClient();

function fallbackText(title: string, message: string): string {
  return `# Dokument: ${title}\n\n**Status:** ${message}\n\n*Dokument został zapisany, ale zawartość musi zostać opisana ręcznie.*`;
}

async function extractTextFromPDF(base64: string, title: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const header = buffer.slice(0, 4).toString('ascii');
    if (!header.startsWith('%PDF')) {
      return fallbackText(title, 'Nieprawidłowy nagłówek PDF');
    }
    const data = await pdfParse(buffer);
    if (data.text && data.text.trim().length > 0) {
      return data.text.trim();
    } else {
      return fallbackText(title, 'PDF nie zawiera tekstu (możliwy skan lub zabezpieczenia)');
    }
  } catch (err: any) {
    return fallbackText(title, `Błąd ekstrakcji: ${err.message || String(err)}`);
  }
}

async function extractTextFromExcel(base64: string, title: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    if (workbook.SheetNames.length === 0) {
      return fallbackText(title, 'Plik Excel nie zawiera arkuszy');
    }
    let output = '';
    workbook.SheetNames.forEach(name => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
      output += `\n### Arkusz: ${name}\n\n${csv}`;
    });
    return output.trim();
  } catch (err: any) {
    return fallbackText(title, `Błąd ekstrakcji z Excela: ${err.message || String(err)}`);
  }
}

async function extractTextFromWord(base64: string, title: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const result = await mammoth.extractRawText({ buffer });
    if (result.value && result.value.trim().length > 0) {
      return result.value.trim();
    } else {
      return fallbackText(title, 'Dokument Word nie zawiera tekstu');
    }
  } catch (err: any) {
    return fallbackText(title, `Błąd ekstrakcji z Worda: ${err.message || String(err)}`);
  }
}

async function migrateDocuments() {
  console.log('🚀 Rozpoczynam migrację dokumentów...');
  try {
    const documents = await prisma.knowledgeDocument.findMany({
      where: {
        OR: [
          { content: { startsWith: 'PDF Document:' } },
          { content: { startsWith: 'Excel Document:' } },
          { content: { startsWith: 'Word Document:' } },
          { content: { startsWith: '# Dokument:' } },
          { content: { startsWith: '**Status:**' } }
        ]
      }
    });

    console.log(`📄 Znaleziono ${documents.length} dokumentów do migracji`);

    for (const doc of documents) {
      console.log(`\n🔄 Przetwarzam: ${doc.title} (${doc.id})`);

      if (!doc.filePath || !doc.filePath.startsWith('base64:')) {
        console.warn('⚠️ Pominięto — brak base64');
        continue;
      }

      const base64Data = doc.filePath.slice(7);
      if (!base64Data || base64Data.length < 20) {
        console.warn('⚠️ Pominięto — uszkodzone dane base64');
        continue;
      }

      let text = '';

      if (doc.fileType === 'pdf') {
        text = await extractTextFromPDF(base64Data, doc.title);
      } else if (doc.fileType === 'excel') {
        text = await extractTextFromExcel(base64Data, doc.title);
      } else if (doc.fileType === 'word') {
        text = await extractTextFromWord(base64Data, doc.title);
      } else if (doc.fileType === 'txt') {
        const buffer = Buffer.from(base64Data, 'base64');
        text = buffer.toString('utf-8').trim();
        if (text.length === 0) {
          text = fallbackText(doc.title, 'Pusty plik tekstowy');
        }
      } else {
        text = fallbackText(doc.title, `Nieznany typ pliku: ${doc.fileType}`);
      }

      await prisma.knowledgeDocument.update({
        where: { id: doc.id },
        data: { content: text }
      });

      console.log(`✅ Zaktualizowano (${text.length} znaków)`);
    }

    console.log('\n✅ Migracja zakończona.');
  } catch (err: any) {
    console.error('❌ Błąd globalny:', err);
  } finally {
    await prisma.$disconnect();
  }
}

migrateDocuments();
