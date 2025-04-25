// src/components/ExcelUploadButton.tsx
'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

// Typ właściwości komponentu
interface ExcelUploadButtonProps {
  onExcelContent: (content: string, metadata: any) => void;
}

export default function ExcelUploadButton({ onExcelContent }: ExcelUploadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Obsługa wgrywania plików Excel
  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);

      // Odczytaj plik Excel jako ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Użyj biblioteki SheetJS do parsowania pliku Excel
      const workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellDates: true,
        cellStyles: true,
        cellNF: true,
      });

      // Pobierz listę arkuszy
      const sheetNames = workbook.SheetNames;
      
      // Przygotuj dane z wszystkich arkuszy
      let allSheetsData: Record<string, any> = {};
      let allSheetsText = '';
      let totalRows = 0;
      let totalColumns = 0;
      
      // Przetwarzanie każdego arkusza
      sheetNames.forEach(sheetName => {
        // Pobierz arkusz
        const worksheet = workbook.Sheets[sheetName];
        
        // Konwertuj arkusz na JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Zapisz dane arkusza
        allSheetsData[sheetName] = jsonData;
        
        // Zlicz wiersze i kolumny
        if (jsonData.length > 0) {
          totalRows += jsonData.length;
          
          // Znajdź najdłuższy wiersz, aby określić liczbę kolumn
          for (const row of jsonData) {
            if (Array.isArray(row) && row.length > totalColumns) {
              totalColumns = row.length;
            }
          }
        }
        
        // Dodaj dane arkusza do tekstu
        allSheetsText += `# Arkusz: ${sheetName}\n\n`;
        
        // Konwertuj arkusz na tekst
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        allSheetsText += csvData + '\n\n';
      });

      // Przygotuj metadane
      const metadata = {
        title: file.name,
        size: file.size,
        type: file.type,
        sheetNames: sheetNames,
        sheetCount: sheetNames.length,
        totalRows: totalRows,
        totalColumns: totalColumns,
        lastModified: new Date(file.lastModified).toISOString(),
        data: allSheetsData
      };

      // Przekaż zawartość i metadane do komponentu nadrzędnego
      onExcelContent(allSheetsText, metadata);
    } catch (error) {
      console.error('Błąd podczas przetwarzania pliku Excel:', error);
      alert('Wystąpił błąd podczas przetwarzania pliku Excel. Sprawdź konsolę aby uzyskać więcej informacji.');
    } finally {
      setIsLoading(false);
      
      // Wyczyść input, aby umożliwić ponowne wgranie tego samego pliku
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div>
      <label
        htmlFor="excel-upload"
        className={`flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-md cursor-pointer hover:bg-gray-50 ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          padding: '6px 12px',
          borderRadius: '6px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.5 : 1
        }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg
              className="animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
            <span>Przetwarzanie...</span>
          </div>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1D6F42" // Kolor Excel
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="8" y1="13" x2="16" y2="13"></line>
              <line x1="8" y1="17" x2="16" y2="17"></line>
              <line x1="10" y1="9" x2="14" y2="9"></line>
            </svg>
            <span>Wgraj XLS</span>
          </>
        )}
      </label>
      <input
        id="excel-upload"
        type="file"
        accept=".xlsx,.xls,.xlsm,.xlsb,.csv"
        onChange={handleExcelUpload}
        disabled={isLoading}
        className="hidden"
        style={{ display: 'none' }}
      />
    </div>
  );
}