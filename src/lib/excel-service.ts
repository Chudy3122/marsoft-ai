// src/lib/excel-service.ts
import * as XLSX from 'xlsx';

/**
 * Analizuje dane Excel za pomocą OpenAI API
 */
export async function analyzeExcelWithOpenAI(
  excelText: string,
  excelMetadata: any,
  prompt: string
): Promise<string> {
  try {
    // Budowanie zapytania do OpenAI
    const apiUrl = '/api/openai/analyze';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        excelContent: excelText,
        metadata: excelMetadata,
        prompt: prompt,
        type: 'excel'
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API responded with ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Błąd podczas analizy Excel:', error);
    return `Przepraszam, wystąpił błąd podczas analizy danych Excel. Spróbuj ponownie później lub zadaj inne pytanie.`;
  }
}

/**
 * Konwertuje plik Excel na czytelny tekst
 */
export function excelToText(workbook: XLSX.WorkBook): string {
  let result = '';
  
  // Iteracja przez wszystkie arkusze
  workbook.SheetNames.forEach(sheetName => {
    result += `# Arkusz: ${sheetName}\n\n`;
    
    const worksheet = workbook.Sheets[sheetName];
    const csvData = XLSX.utils.sheet_to_csv(worksheet);
    
    // Formatowanie danych CSV dla lepszej czytelności
    const rows = csvData.split('\n');
    const formattedRows = rows.map(row => {
      const cells = row.split(',');
      return cells.join('\t');
    });
    
    result += formattedRows.join('\n') + '\n\n';
  });
  
  return result;
}

/**
 * Wyciąga podstawowe statystyki z pliku Excel
 */
export function extractExcelStats(workbook: XLSX.WorkBook): any {
  // Zdefiniuj typ dla obiektu statystyk
  interface SheetStats {
    rows: number;
    columns: number;
    cells: number;
    hasFormulas: boolean;
  }

  // Użyj Record<string, SheetStats> zamiast pustego obiektu {}
  const stats: {
    sheetCount: number;
    sheets: Record<string, SheetStats>;
    totalRows: number;
    totalColumns: number;
    totalCells: number;
    hasFormulas: boolean;
  } = {
    sheetCount: workbook.SheetNames.length,
    sheets: {},
    totalRows: 0,
    totalColumns: 0,
    totalCells: 0,
    hasFormulas: false,
  };
  
  // Analiza poszczególnych arkuszy
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    let maxColumns = 0;
    let rowCount = jsonData.length;
    let cellCount = 0;
    
    // Obliczenie liczby kolumn i komórek
    jsonData.forEach((row: any) => {
      if (Array.isArray(row)) {
        maxColumns = Math.max(maxColumns, row.length);
        cellCount += row.length;
      }
    });
    
    // Sprawdzenie, czy arkusz zawiera formuły
    const hasFormulas = Object.keys(worksheet).some(cell => 
      worksheet[cell]?.f !== undefined
    );
    
    // Dodanie statystyk arkusza
    stats.sheets[sheetName] = {
      rows: rowCount,
      columns: maxColumns,
      cells: cellCount,
      hasFormulas: hasFormulas
    };
    
    // Aktualizacja globalnych statystyk
    stats.totalRows += rowCount;
    stats.totalColumns = Math.max(stats.totalColumns, maxColumns);
    stats.totalCells += cellCount;
    stats.hasFormulas = stats.hasFormulas || hasFormulas;
  });
  
  return stats;
}

/**
 * Przetwarzanie pliku Excel na format odpowiedni do zapisania w bazie danych
 */
export function processExcelFile(arrayBuffer: ArrayBuffer): {
  content: string;
  metadata: any;
} {
  // Parsowanie pliku Excel
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellStyles: true,
    cellNF: true,
  });
  
  // Konwersja do tekstu
  const content = excelToText(workbook);
  
  // Ekstrakcja statystyk
  const stats = extractExcelStats(workbook);
  
  // Przygotowanie metadanych
  const metadata = {
    sheetNames: workbook.SheetNames,
    ...stats
  };
  
  return { content, metadata };
}