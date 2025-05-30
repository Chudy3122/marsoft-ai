// src/lib/file-parsers.ts
export async function parseDocumentFile(file: File): Promise<{
  content: string;
  fileType: string;
  metadata: Record<string, any>;
}> {
  // W prostej implementacji obsługujemy tylko pliki tekstowe
  // W produkcyjnej wersji można dodać obsługę innych formatów (PDF, DOCX, itp.)
  const fileType = file.type.split('/').pop() || file.name.split('.').pop() || 'unknown';
  
  // Czytaj plik jako tekst
  const content = await file.text();
  
  // Metadane podstawowe
  const metadata = {
    originalName: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified)
  };
  
  return {
    content,
    fileType,
    metadata
  };
}