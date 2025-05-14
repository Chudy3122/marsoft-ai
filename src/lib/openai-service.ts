// src/lib/openai-service.ts
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';

// Inicjalizacja klienta OpenAI z kluczem API
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Definicje funkcji wyszukiwania dla OpenAI
const searchFunctionDefinition = {
  name: "search",
  description: "Wyszukuje informacje w internecie.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Zapytanie wyszukiwania"
      }
    },
    required: ["query"]
  }
};

const fetchUrlFunctionDefinition = {
  name: "fetch_url",
  description: "Pobiera treść strony internetowej.",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL strony internetowej do pobrania"
      }
    },
    required: ["url"]
  }
};

/**
 * Funkcja do sprawdzania, czy zapytanie może wymagać wyszukiwania w sieci
 */
function shouldSearchWeb(query: string): boolean {
  // Wzorce dla zapytań, które mogą wymagać aktualnych informacji
  const searchPatterns = [
    /aktualne/i, /najnowsze/i, /ostatnie/i, /bieżące/i, /teraz/i, /dziś/i, /wczoraj/i,
    /wyszukaj/i, /znajdź/i, /szukaj/i, /google/i, /poszukaj/i,
    /sprawdź/i, /zobacz/i, /informacje o/i, /dowiedz się/i,
    /strona/i, /witryna/i, /WWW/i, /http/i, /link/i, /URL/i,
    /termin/i, /konkurs/i, /nabór/i, /ogłoszenie/i,
    /program/i, /UE/i, /unijny/i, /europejski/i,
    /rozporządzenie/i, /ustawa/i, /dokument/i, /przepis/i,
    /2023/i, /2024/i, /2025/i // Aktualne i przyszłe lata
  ];
  
  // Sprawdź, czy zapytanie zawiera URL
  const urlPattern = /https?:\/\/[^\s]+/;
  const hasUrl = urlPattern.test(query);
  
  // Sprawdź, czy zapytanie pasuje do wzorców wyszukiwania
  const matchesSearchPattern = searchPatterns.some(pattern => pattern.test(query));
  
  return hasUrl || matchesSearchPattern;
}

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
 * @param enableWebSearch Opcjonalne włączenie wyszukiwania w sieci (domyślnie false, bo ta funkcja nie korzysta z wyszukiwania)
 * @returns Odpowiedź od API
 */
export async function getOpenAIResponseWithManualSearch(
  prompt: string,
  documentIds: string[] = [],
  enableWebSearch: boolean = true,
  forceManualSearch: boolean = false
): Promise<string> {
  try {
    let documentsContext = "";
    if (documentIds.length > 0) {
      documentsContext = await getDocumentsContent(documentIds);
      console.log("Długość kontekstu dokumentów:", documentsContext.length);
      console.log("Początek kontekstu:", documentsContext.substring(0, 200) + "...");
    }

    let manualSearchContent = "";

    if (enableWebSearch && (forceManualSearch || shouldSearchWeb(prompt))) {
      console.log("[Manual Search] Wykonywanie ręcznego wyszukiwania dla:", prompt);
      const searchResults = await performSearch(prompt);
      manualSearchContent = `\n\nWyniki wyszukiwania:\n${JSON.stringify(searchResults, null, 2)}`;
    }

    const userPromptWithContext = `${documentsContext}\n${manualSearchContent}\n\nPytanie użytkownika: ${prompt}\n\nOdpowiedz na podstawie dostarczonych informacji.`;

    const systemPrompt = `Jesteś asystentem MarsoftAI, pomocnym i wszechstronnym asystentem. Twoją specjalizacją są projekty UE, dokumentacja projektowa i fundusze europejskie, ale możesz też odpowiadać na inne pytania związane z pracą i ogólnie przydatną wiedzą. Odpowiadasz zawsze po polsku, zwięźle i rzeczowo.

${enableWebSearch ? 'Masz możliwość wyszukiwania informacji w internecie, aby zapewnić aktualne i dokładne odpowiedzi.' : 'Opieraj się na swoich wewnętrznych informacjach i udostępnionych dokumentach.'}

FORMATOWANIE: Używaj składni Markdown, aby zapewnić dobrą czytelność odpowiedzi:
1. Wszystkie listy punktowane formatuj używając myślników (-) i nowej linii dla każdego punktu
2. Wszystkie listy numerowane formatuj jako 1., 2., itd., zawsze w nowej linii
3. Używaj nagłówków (## dla głównych sekcji, ### dla podsekcji)
4. Wydzielaj poszczególne sekcje pustymi liniami
5. Używaj **pogrubienia** dla ważnych terminów i pojęć
6. Nigdy nie używaj punktów oddzielonych tylko spacjami - zawsze używaj właściwego formatowania Markdown z nowymi liniami
${enableWebSearch ? '7. Jeśli podajesz informacje znalezione w internecie, zawsze podawaj źródła w formie linków.' : ''}

Jeśli użytkownik załączył jakieś dokumenty, to ważne, abyś bazował na ich treści w swojej odpowiedzi. Dokumenty są bardzo ważnym kontekstem dla Twoich odpowiedzi.

ZASADY ODPOWIADANIA:
- NIE odpowiadaj na pytania obraźliwe, niemoralne, nielegalne lub wyraźnie szkodliwe.
- NIE odpowiadaj na żądania tworzenia treści dla dorosłych, propagandy lub dezinformacji.
- NIE odpowiadaj na absolutne bzdury i treści pozbawione jakiegokolwiek sensu.
- Odpowiadaj na pytania związane z tematami zawodowymi, edukacyjnymi i ogólnie przydatnymi.
- Możesz odpowiadać na pytania o tematy niezwiązane bezpośrednio z projektami UE, jeśli są związane z pracą lub wiedzą ogólną.
- Staraj się być pomocny i udzielać rzetelnych informacji w rozsądnych granicach.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-2024-04-16",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPromptWithContext }
      ],
      temperature: 1,
      max_tokens: 4096
    });

    const rawResponse = response.choices[0]?.message?.content || "Brak odpowiedzi.";
    return improveMarkdownFormatting(rawResponse);

  } catch (error) {
    console.error("Błąd podczas generowania odpowiedzi:", error);
    return "Przepraszam, wystąpił błąd podczas przetwarzania Twojego zapytania. Spróbuj ponownie później.";
  }
}

/**
 * Funkcja do wykonania wyszukiwania w sieci
 */
async function performSearch(query: string): Promise<any> {
  try {
    // Tutaj możesz zaimplementować rzeczywiste wyszukiwanie z API
    // Na razie zwracamy uproszczone wyniki
    return {
      results: [
        {
          title: "Wynik wyszukiwania dla: " + query,
          url: query.includes("http") ? query : "https://example.com/result",
          snippet: "To jest przykładowy fragment wyników wyszukiwania dla zapytania: " + query
        }
      ]
    };
  } catch (error) {
    console.error("Błąd wyszukiwania:", error);
    return { error: "Nie udało się wykonać wyszukiwania" };
  }
}

/**
 * Funkcja do pobierania treści strony
 */
export async function fetchWebContent(url: string): Promise<any> {
  try {
    const response = await fetch('/api/web-fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Błąd pobierania strony: ${response.status}`);
    }

    const result = await response.json();

    // Używamy tylko 'snippet', który zawiera przetworzony i ograniczony tekst
    return {
      title: result.title,
      url: result.url,
      content: result.snippet || 'Brak dostępnej treści.'
    };

  } catch (error) {
    console.error("Błąd pobierania strony:", error);
    return { error: "Nie udało się pobrać treści strony" };
  }
}


/**
 * Funkcja do pobierania odpowiedzi od OpenAI z możliwością wyszukiwania w sieci
 * @param prompt Zapytanie do API
 * @param documentIds Opcjonalne ID dokumentów z biblioteki wiedzy i/lub bazy danych
 * @param enableWebSearch Czy włączyć wyszukiwanie w sieci
 * @returns Odpowiedź od API
 */
export async function getOpenAIResponseWithWebSearch(
  prompt: string, 
  documentIds: string[] = [],
  enableWebSearch: boolean = true
): Promise<string> {
  try {
    // Pobierz treść dokumentów, jeśli są
    let documentsContext = "";
    if (documentIds.length > 0) {
      documentsContext = await getDocumentsContent(documentIds);
      console.log("Długość kontekstu dokumentów:", documentsContext.length);
    }

    const systemPrompt = `Jesteś asystentem MarsoftAI, specjalistą od projektów UE. Pomagasz w tworzeniu dokumentacji projektowej, odpowiadasz na pytania związane z funduszami europejskimi, i doradzasz w kwestiach pisania wniosków, raportów, harmonogramów i budżetów. Odpowiadasz zawsze po polsku, zwięźle i rzeczowo.

${enableWebSearch ? 'Masz możliwość wyszukiwania informacji w internecie, aby zapewnić aktualne i dokładne odpowiedzi.' : 'Nie masz dostępu do internetu, więc opieraj się tylko na swoich wewnętrznych informacjach i udostępnionych dokumentach.'}

FORMATOWANIE: Używaj składni Markdown, aby zapewnić dobrą czytelność odpowiedzi:
1. Wszystkie listy punktowane formatuj używając myślników (-) i nowej linii dla każdego punktu
2. Wszystkie listy numerowane formatuj jako 1., 2., itd., zawsze w nowej linii
3. Używaj nagłówków (## dla głównych sekcji, ### dla podsekcji)
4. Wydzielaj poszczególne sekcje pustymi liniami
5. Używaj **pogrubienia** dla ważnych terminów i pojęć
6. Nigdy nie używaj punktów oddzielonych tylko spacjami - zawsze używaj właściwego formatowania Markdown z nowymi liniami
${enableWebSearch ? '7. Jeśli podajesz informacje znalezione w internecie, zawsze podawaj źródła w formie linków.' : ''}

Jeśli użytkownik załączył jakieś dokumenty, to ważne, abyś bazował na ich treści w swojej odpowiedzi. Dokumenty są bardzo ważnym kontekstem dla Twoich odpowiedzi.

BARDZO WAŻNE: Odpowiadaj TYLKO na pytania związane z pracą, projektami UE, dokumentacją projektową, funduszami europejskimi i podobnymi tematami zawodowymi.`;
    
    // Dodaj kontekst dokumentów do promptu użytkownika
    const userPromptWithContext = documentIds.length > 0 
      ? `Dokumenty referencyjne:\n${documentsContext}\n\nPytanie użytkownika: ${prompt}\n\nOdpowiedz na podstawie dostarczonych dokumentów i swojej wiedzy ogólnej. Pamiętaj o prawidłowym formatowaniu Markdown.`
      : `${prompt}\n\nPamiętaj o prawidłowym formatowaniu Markdown w odpowiedzi.`;

    // Sprawdź, czy zapytanie może wymagać wyszukiwania w sieci i czy wyszukiwanie jest włączone
    const shouldUseWebSearch = enableWebSearch && shouldSearchWeb(prompt);
    
    let response;
    
    if (shouldUseWebSearch) {
      console.log("Używam wyszukiwania w sieci dla zapytania:", prompt);
      // Użyj modelu z dostępem do funkcji wyszukiwania
      response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPromptWithContext }
        ],
        temperature: 1,
        max_tokens: 4096,
        tools: [
          { type: "function", function: searchFunctionDefinition },
          { type: "function", function: fetchUrlFunctionDefinition }
        ],
        tool_choice: "auto"
      });
      
      // Sprawdź, czy model chce użyć narzędzia
      const message = response.choices[0].message;
      
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log("Model chce użyć narzędzia:", message.tool_calls);
        
        // Przygotuj tablicę na wyniki narzędzi
        const toolResults: ChatCompletionMessageParam[] = [];
        
        // Obsłuż każde wywołanie narzędzia
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          if (functionName === 'search') {
            console.log("Wykonuję wyszukiwanie:", functionArgs.query);
            const searchResults = await performSearch(functionArgs.query);
            
            toolResults.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(searchResults)
            });
          }
          
          if (functionName === 'fetch_url') {
            console.log("Pobieram treść strony:", functionArgs.url);
            const fetchResults = await fetchWebContent(functionArgs.url);
            
            toolResults.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(fetchResults)
            });
          }
        }
        
        // Dodaj wyniki do wiadomości i uzyskaj ostateczną odpowiedź
        const finalResponse = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPromptWithContext },
            message,
            ...toolResults
          ],
          temperature: 1,
          max_tokens: 4096,
        });
        
        const finalContent = finalResponse.choices[0]?.message?.content || "Przepraszam, nie udało się uzyskać odpowiedzi.";
        return improveMarkdownFormatting(finalContent);
      }
    } else {
      console.log("Używam standardowego zapytania bez wyszukiwania w sieci");
      // Użyj modelu bez dostępu do funkcji wyszukiwania
      response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPromptWithContext }
        ],
        temperature: 1,
        max_tokens: 4096
      });
    }

    // Pobierz tekst odpowiedzi (wykonywane tylko jeśli nie było wywołań narzędzi)
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
 * @param enableWebSearch Czy włączyć wyszukiwanie w internecie
 * @returns Odpowiedź od API
 */
export async function analyzePdfWithOpenAI(
  pdfText: string, 
  pdfMetadata: any, 
  query: string, 
  documentIds: string[] = [],
  enableWebSearch: boolean = true
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
    
    // Użyj funkcji z możliwością wyszukiwania
    const response = await getOpenAIResponseWithWebSearch(fullContext, [], enableWebSearch);
    
    // Popraw formatowanie Markdown przed zwróceniem odpowiedzi
    return improveMarkdownFormatting(response);
  } catch (error) {
    console.error('Błąd podczas analizy PDF z OpenAI:', error);
    return "Przepraszam, wystąpił błąd podczas analizy dokumentu. Spróbuj ponownie później :(.";
  }
}

/**
 * Funkcja do analizy danych Excel z wykorzystaniem OpenAI
 * @param excelText Tekst wyekstrahowany z arkusza Excel
 * @param excelMetadata Metadane Excel (nazwa, liczba arkuszy, wierszy, itp.)
 * @param query Zapytanie użytkownika
 * @param documentIds Opcjonalne ID dokumentów z biblioteki wiedzy
 * @param enableWebSearch Czy włączyć wyszukiwanie w internecie
 * @returns Odpowiedź od API
 */
export async function analyzeExcelWithOpenAI(
  excelText: string, 
  excelMetadata: any, 
  query: string,
  documentIds: string[] = [],
  enableWebSearch: boolean = true
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
    
    // Użyj funkcji z możliwością wyszukiwania
    const response = await getOpenAIResponseWithWebSearch(fullContext, [], enableWebSearch);
    
    // Popraw formatowanie Markdown przed zwróceniem odpowiedzi
    return improveMarkdownFormatting(response);
  } catch (error) {
    console.error('Błąd podczas analizy Excel z OpenAI:', error);
    return "Przepraszam, wystąpił błąd podczas analizy arkusza Excel. Spróbuj ponownie później.";
  }
}

/**
 * Funkcja do generowania PDF przez asystenta AI i zwracania linku
 * @param prompt Zapytanie użytkownika o wygenerowanie dokumentu
 * @param chatId ID czatu
 * @param documentTitle Tytuł dokumentu
 * @returns Odpowiedź od API z linkiem do wygenerowanego PDF
 */
export async function generatePdfDocument(
  prompt: string,
  chatId: string,
  documentTitle?: string
): Promise<{ message: string; pdfUrl: string; documentId?: string }> {
  try {
    // Najpierw wygeneruj treść dokumentu za pomocą OpenAI
    const pdfContent = await getOpenAIResponseWithWebSearch(
      `Wygeneruj dokument w formacie markdown na podstawie zapytania: "${prompt}". 
      Użyj formatowania markdown z nagłówkami (## i ###), pogrubieniami (**tekst**), 
      listami punktowanymi (- punkt) lub numerowanymi (1. punkt).`,
      [],
      true
    );
    
    // Tytuł dokumentu (z zapytania lub domyślny)
    const title = documentTitle || `Dokument: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`;
    
    // Teraz wyślij zapytanie do endpointu generowania PDF
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content: pdfContent,
        chatId,
        addToChat: true
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Problem z generowaniem PDF. Status: ${response.status}`);
    }
    
    // Pobierz link do pliku PDF i ID dokumentu z nagłówków odpowiedzi
    const documentId = response.headers.get('Document-Id') || undefined;
    
    // Utwórz blob URL dla odpowiedzi
    const blob = await response.blob();
    const pdfUrl = URL.createObjectURL(blob);
    
    return {
      message: `Wygenerowałem dokument "${title}". Możesz go pobrać lub przeglądać bezpośrednio w konwersacji.`,
      pdfUrl,
      documentId
    };
    
  } catch (error) {
    console.error('Błąd podczas generowania dokumentu PDF:', error);
    return {
      message: "Przepraszam, wystąpił problem podczas generowania dokumentu PDF. Spróbuj ponownie później.",
      pdfUrl: ""
    };
  }
}

/**
 * Funkcja do obsługi żądań użytkownika związanych z generowaniem dokumentów
 * @param prompt Zapytanie użytkownika 
 * @param chatId ID czatu
 * @returns Odpowiedź dla użytkownika
 */
export async function handleDocumentGeneration(
  prompt: string,
  chatId: string
): Promise<{ text: string; pdfUrl?: string; documentId?: string }> {
  // Rozbudowany zestaw wzorców do wykrywania żądań generowania dokumentów
  const generateDocumentPatterns = [
    // Wzorce bezpośrednio związane z dokumentami
    /wygeneruj (?:dla mnie )?(?:dokument|pdf|plik pdf|raport)/i,
    /(?:stwórz|utwórz|przygotuj|zrób)(?:\s+dla\s+mnie)?\s+(?:dokument|pdf|plik pdf|raport)/i,
    /(?:zrób|wygeneruj|stwórz) (?:dla mnie )?(?:pdf|plik pdf|dokument pdf)/i,
    /(?:zapisz|wyeksportuj)(?:\s+to)?\s+(?:jako|do|w)?\s+(?:pdf|dokument|pliku)/i,
    /(?:zrób|utwórz)(?:\s+z\s+tego)?\s+(?:dokument|pdf|plik)/i,
    /(?:sporządź|generuj|wykonaj)(?:\s+dla\s+mnie)?\s+(?:dokument|raport|pdf)/i,
    
    // Wzorce z listy, tabelą itp.
    /(?:stwórz|przygotuj|wygeneruj)(?:\s+dla\s+mnie)?\s+(?:listę|zestawienie|tabelę|wykaz)/i,
    /(?:zrób|utwórz|stwórz)(?:\s+dla\s+mnie)?\s+(?:listę|zestawienie|tabelę|wykaz|podsumowanie)/i,
    
    // Wzorce z dokumentami specyficznymi
    /(?:przygotuj|wygeneruj|stwórz)(?:\s+dla\s+mnie)?\s+(?:ofertę|umowę|sprawozdanie|analizę)/i,
    /(?:napisz|przygotuj)(?:\s+dla\s+mnie)?\s+(?:protokół|zarys|kosztorys|specyfikację)/i,
    
    // Wzorce z frazami formalnymi
    /(?:uprzejmie\s+proszę\s+o\s+przygotowanie|czy\s+mógłbyś\s+przygotować)(?:\s+dla\s+mnie)?\s+(?:dokumentu|raportu|pliku|pdf)/i,
    /(?:potrzebuję|chciałbym)(?:\s+otrzymać)?\s+(?:dokument|raport|plik pdf|zestawienie)/i
  ];
  
  // Sprawdź, czy zapytanie pasuje do któregokolwiek z wzorców
  let isDocumentRequest = generateDocumentPatterns.some(pattern => pattern.test(prompt));
  
  // Dodatkowe sprawdzanie kontekstowe dla prostszych fraz
  // Jeśli fraza jest prosta, ale zawiera słowo kluczowe i kontekst dokumentu
  if (!isDocumentRequest) {
    const simplePatterns = [
      /(?:lista|zestawienie|tabela|wykaz|spis)/i,
      /(?:raport|pdf|dokument)/i,
      /(?:podsumowanie|analiza)/i
    ];
    
    const documentContextPatterns = [
      /(?:osób|ludzi|personelu|pracowników|uczestników)/i,
      /(?:projekt|ue|unii|europejski|regionalny)/i,
      /(?:zadań|kosztów|wydatków|harmonogram)/i
    ];
    
    const hasSimplePattern = simplePatterns.some(pattern => pattern.test(prompt));
    const hasContextPattern = documentContextPatterns.some(pattern => pattern.test(prompt));
    
    // Jeśli zapytanie zawiera zarówno prostą frazę jak i kontekst dokumentu, uznaj za żądanie dokumentu
    if (hasSimplePattern && hasContextPattern) {
      console.log("Wykryto kontekstowe żądanie dokumentu:", prompt);
      isDocumentRequest = true;
    }
  }
  
  if (!isDocumentRequest) {
    // Jeśli nie jest to żądanie dokumentu, zwróć pusty tekst - normalna odpowiedź AI
    return { text: "" };
  }
  
  console.log("Wykryto żądanie generowania dokumentu:", prompt);
  
  // Ekstrahuj tytuł dokumentu, jeśli został podany
  const titleMatch = prompt.match(/z tytułem [\"\'](.*?)[\"\']/i) || 
                    prompt.match(/tytułem [\"\'](.*?)[\"\']/i) ||
                    prompt.match(/zatytułowany [\"\'](.*?)[\"\']/i) ||
                    prompt.match(/nazwa [\"\'](.*?)[\"\']/i) ||
                    prompt.match(/pt\. [\"\'](.*?)[\"\']/i);
  
  const documentTitle = titleMatch ? titleMatch[1] : undefined;
  
  // Ekstrahuj treść zapytania bez instrukcji generowania PDF
  // Rozbudowane wzorce do usuwania instrukcji generowania
  const contentPrompt = prompt
    .replace(/(?:wygeneruj|stwórz|przygotuj|utwórz|zrób|sporządź|generuj|wykonaj)(?:\s+dla\s+mnie)?(?:\s+(?:dokument|pdf|plik|raport|listę|zestawienie|tabelę|wykaz|podsumowanie|ofertę|umowę|sprawozdanie|analizę|protokół|zarys|kosztorys|specyfikację))/gi, '')
    .replace(/(?:zapisz|wyeksportuj)(?:\s+to)?(?:\s+(?:jako|do|w))?(?:\s+(?:pdf|dokument|plik))/gi, '')
    .replace(/(?:uprzejmie\s+proszę\s+o\s+przygotowanie|czy\s+mógłbyś\s+przygotować)(?:\s+dla\s+mnie)?(?:\s+(?:dokumentu|raportu|pliku|pdf))/gi, '')
    .replace(/(?:potrzebuję|chciałbym)(?:\s+otrzymać)?(?:\s+(?:dokument|raport|plik|zestawienie))/gi, '')
    .replace(/z tytułem [\"\'](.*?)[\"\']|tytułem [\"\'](.*?)[\"\']|zatytułowany [\"\'](.*?)[\"\']|nazwa [\"\'](.*?)[\"\']|pt\. [\"\'](.*?)[\"\']/gi, '')
    .trim();
  
  // Wygeneruj dokument
  const result = await generatePdfDocument(contentPrompt, chatId, documentTitle);
  
  return {
    text: result.message,
    pdfUrl: result.pdfUrl,
    documentId: result.documentId
  };
}