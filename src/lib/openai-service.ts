// src/lib/openai-service.ts
import OpenAI from 'openai';

// Inicjalizacja klienta OpenAI z kluczem API
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Pobieranie treści dokumentów z biblioteki wiedzy
 */
async function getDocumentsContent(documentIds: string[]): Promise<string> {
  if (documentIds.length === 0) return "";
  
  try {
    console.log("Pobieranie treści dokumentów:", documentIds);
    
    const response = await fetch(`/api/knowledge/documents/content?ids=${documentIds.join(',')}`);
    if (!response.ok) {
      console.error("Błąd odpowiedzi API:", response.status, response.statusText);
      throw new Error('Problem z pobraniem treści dokumentów');
    }
    
    const data = await response.json();
    console.log("Odpowiedź API documents/content:", data);
    
    if (!data.documents || !Array.isArray(data.documents) || data.documents.length === 0) {
      console.warn("Brak dokumentów w odpowiedzi API");
      return "Nie znaleziono dokumentów.";
    }
    
    // Upewnij się, że zwracany string zawiera pełną treść dokumentów
    let documentsText = "";
    
    for (const doc of data.documents) {
      if (doc.content) {
        documentsText += `\n--- Dokument "${doc.title || 'Bez tytułu'}" (${doc.fileType || 'nieznany'}) ---\n\n${doc.content}\n\n`;
      } else {
        console.warn(`Dokument ${doc.id} nie zawiera treści`);
      }
    }
    
    console.log(`Pobrano treść ${data.documents.length} dokumentów, łączna długość: ${documentsText.length} znaków`);
    
    return documentsText;
  } catch (error) {
    console.error('Błąd podczas pobierania treści dokumentów:', error);
    return "Nie udało się pobrać treści dokumentów.";
  }
}

/**
 * Funkcja do pobierania odpowiedzi od OpenAI
 * @param prompt Zapytanie do API
 * @param documentIds Opcjonalne ID dokumentów z biblioteki wiedzy
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

Jeśli użytkownik załączył jakieś dokumenty, to ważne, abyś bazował na ich treści w swojej odpowiedzi. Dokumenty są bardzo ważnym kontekstem dla Twoich odpowiedzi.

BARDZO WAŻNE: Odpowiadaj TYLKO na pytania związane z pracą, projektami UE, dokumentacją projektową, funduszami europejskimi i podobnymi tematami zawodowymi.`;
    
    // Dodaj kontekst dokumentów do promptu użytkownika
    const userPromptWithContext = documentIds.length > 0 
      ? `Dokumenty referencyjne:\n${documentsContext}\n\nPytanie użytkownika: ${prompt}\n\nOdpowiedz na podstawie dostarczonych dokumentów i swojej wiedzy ogólnej.`
      : prompt;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPromptWithContext }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    return response.choices[0]?.message?.content || "Przepraszam, nie udało się wygenerować odpowiedzi.";
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
Analizowany dokument PDF:
Tytuł: ${pdfMetadata.title || 'Nieznany'}
Liczba stron: ${pdfMetadata.pages || 'Nieznana'}

Zawartość dokumentu (fragment):
${pdfText.substring(0, 3000)}...
`;

    if (documentsContext) {
      fullContext += `\nDodatkowe dokumenty referencyjne:\n${documentsContext}`;
    }

    fullContext += `\nNa podstawie powyższej zawartości, odpowiedz na pytanie: ${query}`;
    
    return await getOpenAIResponse(fullContext);
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
Analizowany arkusz Excel:
Tytuł: ${excelMetadata.title || 'Nieznany'}
Liczba arkuszy: ${excelMetadata.sheetCount || 'Nieznana'}
Liczba wierszy: ${excelMetadata.totalRows || 'Nieznana'}
Liczba kolumn: ${excelMetadata.totalColumns || 'Nieznana'}

Zawartość arkusza (fragment):
${excelText.substring(0, 3000)}...
`;

    if (documentsContext) {
      fullContext += `\nDodatkowe dokumenty referencyjne:\n${documentsContext}`;
    }

    fullContext += `\nNa podstawie powyższej zawartości, odpowiedz na pytanie: ${query}`;
    
    return await getOpenAIResponse(fullContext);
  } catch (error) {
    console.error('Błąd podczas analizy Excel z OpenAI:', error);
    return "Przepraszam, wystąpił błąd podczas analizy arkusza Excel. Spróbuj ponownie później.";
  }
}