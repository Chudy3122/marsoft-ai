// src/lib/openai-service.ts
import OpenAI from 'openai';

// Inicjalizacja klienta OpenAI z kluczem API
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Pobiera dokument z bazy danych na podstawie ID
 */
async function getDocument(documentId: string): Promise<any> {
  try {
    console.log(`Pobieranie dokumentu o ID: ${documentId}`);
    
    // Poprawny URL do pobrania dokumentu - bezpośrednio z API dokumentów
    const response = await fetch(`/api/documents/${documentId}`);
    if (!response.ok) {
      console.error("Błąd odpowiedzi API:", response.status, response.statusText);
      throw new Error(`Problem z pobraniem dokumentu o ID: ${documentId}`);
    }
    
    const data = await response.json();
    return data.document;
  } catch (error) {
    console.error(`Błąd podczas pobierania dokumentu ${documentId}:`, error);
    return null;
  }
}

/**
 * Pobieranie treści dokumentów z bazy danych i biblioteki wiedzy
 */
async function getDocumentsContent(documentIds: string[]): Promise<string> {
  if (documentIds.length === 0) return "";
  
  try {
    console.log("Pobieranie treści dokumentów:", documentIds);
    
    // Przygotuj listę obietnic dla wszystkich żądań
    const documentPromises = documentIds.map(async (docId) => {
      // Najpierw sprawdź czy dokument pochodzi z biblioteki wiedzy
      try {
        const response = await fetch(`/api/knowledge/documents/content?ids=${docId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.documents && data.documents.length > 0) {
            return data.documents[0]; // Zwróć dokument z biblioteki wiedzy
          }
        }
      } catch (error) {
        console.warn(`Błąd podczas próby pobrania dokumentu ${docId} z biblioteki wiedzy:`, error);
      }
      
      // Jeśli nie znaleziono w bibliotece wiedzy, spróbuj pobrać z czatu
      return getDocument(docId);
    });
    
    // Wykonaj wszystkie żądania równolegle
    const documents = await Promise.all(documentPromises);
    
    // Filtruj niepuste dokumenty
    const validDocuments = documents.filter(doc => doc !== null && doc.content);
    
    // Upewnij się, że zwracany string zawiera pełną treść dokumentów
    let documentsText = "";
    
    for (const doc of validDocuments) {
      if (doc.content) {
        documentsText += `\n### Dokument: "${doc.title || 'Bez tytułu'}" (${doc.fileType || 'nieznany'})\n\n${doc.content}\n\n`;
      } else {
        console.warn(`Dokument ${doc.id} nie zawiera treści`);
      }
    }
    
    console.log(`Pobrano treść ${validDocuments.length} dokumentów, łączna długość: ${documentsText.length} znaków`);
    
    return documentsText;
  } catch (error) {
    console.error('Błąd podczas pobierania treści dokumentów:', error);
    return "Nie udało się pobrać treści dokumentów.";
  }
}

/**
 * Funkcja pomocnicza do poprawy formatowania Markdown dla lepszego wyświetlania
 */
function improveMarkdownFormatting(markdown: string): string {
  let improved = markdown;

  // Zapewniamy, że każdy element listy jest w osobnej linii
  improved = improved.replace(/(\d+\. [^\n]+)(?=\d+\.)/g, '$1\n');
  improved = improved.replace(/(- [^\n]+)(?=- )/g, '$1\n');
  
  // Zapewniamy, że przed nagłówkami jest pusta linia
  improved = improved.replace(/([^\n])(\n#{1,3} )/g, '$1\n$2');
  
  // Zapewniamy, że po nagłówkach jest pusta linia
  improved = improved.replace(/(#{1,3} [^\n]+)(\n[^#\n])/g, '$1\n$2');
  
  // Zapewniamy, że każdy element listy numerowanej ma liczbę i kropkę (np. "1. ")
  improved = improved.replace(/^(\d+)([^\.\s])/gm, '$1. $2');
  
  // Zapewniamy, że każdy element listy punktowanej ma myślnik i spację (np. "- ")
  improved = improved.replace(/^(\*|\+)(?!\*)\s*/gm, '- ');
  
  // Zapewniamy, że po liscie jest pusta linia
  improved = improved.replace(/((?:- |\d+\. ).+)(\n[^-\d\n])/g, '$1\n$2');
  
  return improved;
}

/**
 * Funkcja do pobierania odpowiedzi od OpenAI
 * @param prompt Zapytanie do API
 * @param documentIds Opcjonalne ID dokumentów z biblioteki wiedzy i/lub bazy danych
 * @returns Odpowiedź od API
 */
export async function getOpenAIResponse(prompt: string, documentIds: string[] = []): Promise<string> {
  try {
    // Pobierz treść dokumentów, jeśli są
    let documentsContext = "";
    if (documentIds.length > 0) {
      documentsContext = await getDocumentsContent(documentIds);
      console.log("Długość kontekstu dokumentów:", documentsContext.length);
      // Możesz też zalogować pierwsze 200 znaków kontekstu aby zobaczyć co jest przekazywane
      console.log("Początek kontekstu:", documentsContext.substring(0, 200) + "...");
    }

    const systemPrompt = `Jesteś asystentem MarsoftAI, specjalistą od projektów UE. Pomagasz w tworzeniu dokumentacji projektowej, odpowiadasz na pytania związane z funduszami europejskimi, i doradzasz w kwestiach pisania wniosków, raportów, harmonogramów i budżetów. Odpowiadasz zawsze po polsku, zwięźle i rzeczowo.

FORMATOWANIE: Używaj składni Markdown, aby zapewnić dobrą czytelność odpowiedzi:
1. Wszystkie listy punktowane formatuj używając myślników (-) i nowej linii dla każdego punktu
2. Wszystkie listy numerowane formatuj jako 1., 2., itd., zawsze w nowej linii
3. Używaj nagłówków (## dla głównych sekcji, ### dla podsekcji)
4. Wydzielaj poszczególne sekcje pustymi liniami
5. Używaj **pogrubienia** dla ważnych terminów i pojęć
6. Nigdy nie używaj punktów oddzielonych tylko spacjami - zawsze używaj właściwego formatowania Markdown z nowymi liniami

Jeśli użytkownik załączył jakieś dokumenty, to ważne, abyś bazował na ich treści w swojej odpowiedzi. Dokumenty są bardzo ważnym kontekstem dla Twoich odpowiedzi.

BARDZO WAŻNE: Odpowiadaj TYLKO na pytania związane z pracą, projektami UE, dokumentacją projektową, funduszami europejskimi i podobnymi tematami zawodowymi.`;
    
    // Dodaj kontekst dokumentów do promptu użytkownika
    const userPromptWithContext = documentIds.length > 0 
      ? `Dokumenty referencyjne:\n${documentsContext}\n\nPytanie użytkownika: ${prompt}\n\nOdpowiedz na podstawie dostarczonych dokumentów i swojej wiedzy ogólnej. Pamiętaj o prawidłowym formatowaniu Markdown.`
      : `${prompt}\n\nPamiętaj o prawidłowym formatowaniu Markdown w odpowiedzi.`;

    const response = await openai.chat.completions.create({
      model: "o4-mini-2025-04-16",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPromptWithContext }
      ],
      temperature: 1,
      max_completion_tokens: 60000,
    });

    // Pobierz tekst odpowiedzi
    const rawResponse = response.choices[0]?.message?.content || "Przepraszam, nie udało się wygenerować odpowiedzi.";
    
    // Popraw formatowanie Markdown przed zwróceniem odpowiedzi
    return improveMarkdownFormatting(rawResponse);
  } catch (error) {
    console.error('Błąd podczas pobierania odpowiedzi z OpenAI:', error);
    return "Przepraszam, wystąpił błąd podczas przetwarzania Twojego zapytania. Spróbuj ponownie później.";
  }
}

/**
 * Funkcja do analizy tekstu wyekstrahowanego z PDF z wykorzystaniem OpenAI
 * @param pdfText Tekst wyekstrahowany z PDF
 * @param pdfMetadata Metadane PDF (nazwa, liczba stron, itp.)
 * @param query Zapytanie użytkownika
 * @param documentIds Opcjonalne ID dokumentów z biblioteki wiedzy
 * @returns Odpowiedź od API
 */
export async function analyzePdfWithOpenAI(
  pdfText: string, 
  pdfMetadata: any, 
  query: string, 
  documentIds: string[] = []
): Promise<string> {
  try {
    // Pobierz treść dokumentów z biblioteki, jeśli są
    let documentsContext = "";
    if (documentIds.length > 0) {
      documentsContext = await getDocumentsContent(documentIds);
    }

    // Połącz kontekst PDF i dokumentów z biblioteki
    let fullContext = `
## Analizowany dokument PDF:
- Tytuł: ${pdfMetadata.title || 'Nieznany'}
- Liczba stron: ${pdfMetadata.pages || 'Nieznana'}

### Zawartość dokumentu (fragment):
${pdfText.substring(0, 3000)}...
`;

    if (documentsContext) {
      fullContext += `\n## Dodatkowe dokumenty referencyjne:\n${documentsContext}`;
    }

    fullContext += `\n## Na podstawie powyższej zawartości, odpowiedz na pytanie:\n${query}\n\nPamiętaj o prawidłowym formatowaniu Markdown w odpowiedzi.`;
    
    const response = await getOpenAIResponse(fullContext);
    
    // Popraw formatowanie Markdown przed zwróceniem odpowiedzi
    return improveMarkdownFormatting(response);
  } catch (error) {
    console.error('Błąd podczas analizy PDF z OpenAI:', error);
    return "Przepraszam, wystąpił błąd podczas analizy dokumentu. Spróbuj ponownie później.";
  }
}

/**
 * Funkcja do analizy danych Excel z wykorzystaniem OpenAI
 * @param excelText Tekst wyekstrahowany z arkusza Excel
 * @param excelMetadata Metadane Excel (nazwa, liczba arkuszy, wierszy, itp.)
 * @param query Zapytanie użytkownika
 * @param documentIds Opcjonalne ID dokumentów z biblioteki wiedzy
 * @returns Odpowiedź od API
 */
export async function analyzeExcelWithOpenAI(
  excelText: string, 
  excelMetadata: any, 
  query: string,
  documentIds: string[] = []
): Promise<string> {
  try {
    // Pobierz treść dokumentów z biblioteki, jeśli są
    let documentsContext = "";
    if (documentIds.length > 0) {
      documentsContext = await getDocumentsContent(documentIds);
    }

    // Połącz kontekst Excel i dokumentów z biblioteki
    let fullContext = `
## Analizowany arkusz Excel:
- Tytuł: ${excelMetadata.title || 'Nieznany'}
- Liczba arkuszy: ${excelMetadata.sheetCount || 'Nieznana'}
- Liczba wierszy: ${excelMetadata.totalRows || 'Nieznana'}
- Liczba kolumn: ${excelMetadata.totalColumns || 'Nieznana'}

### Zawartość arkusza (fragment):
\`\`\`
${excelText.substring(0, 3000)}...
\`\`\`
`;

    if (documentsContext) {
      fullContext += `\n## Dodatkowe dokumenty referencyjne:\n${documentsContext}`;
    }

    fullContext += `\n## Na podstawie powyższej zawartości, odpowiedz na pytanie:\n${query}\n\nPamiętaj o prawidłowym formatowaniu Markdown w odpowiedzi.`;
    
    const response = await getOpenAIResponse(fullContext);
    
    // Popraw formatowanie Markdown przed zwróceniem odpowiedzi
    return improveMarkdownFormatting(response);
  } catch (error) {
    console.error('Błąd podczas analizy Excel z OpenAI:', error);
    return "Przepraszam, wystąpił błąd podczas analizy arkusza Excel. Spróbuj ponownie później.";
  }
}