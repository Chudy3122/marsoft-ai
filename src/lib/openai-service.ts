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
  console.log(`🔍 Sprawdzanie czy zapytanie wymaga wyszukiwania: "${query}"`);
  
  // Wzorce dla zapytań, które mogą wymagać aktualnych informacji
  const searchPatterns = [
    // Wskaźniki czasowe
    /\b(aktualne|najnowsze|ostatnie|bieżące|teraz|dziś|wczoraj|2024|2025)\b/i,
    
    // Akcje wyszukiwania
    /\b(wyszukaj|znajdź|szukaj|poszukaj|sprawdź|zobacz|dowiedz się)\b/i,
    
    // Informacje internetowe
    /\b(strona|witryna|www|http|link|url)\b/i,
    
    // Terminy i nabory
    /\b(termin|konkurs|nabór|ogłoszenie|rekrutacja)\b/i,
    
    // Programy UE i finansowanie
    /\b(program|ue|unijny|europejski|horyzont|erasmus|interreg)\b/i,
    
    // Przepisy i dokumenty
    /\b(rozporządzenie|ustawa|dokument|przepis|regulacja)\b/i,
    
    // Dane finansowe i gospodarcze
    /\b(ceny|kurs|giełda|notowania|inflacja|pkb)\b/i,
    
    // Wydarzenia i aktualności
    /\b(news|wiadomości|wydarzenia|konferencja|spotkanie)\b/i,
    
    // Dane kontaktowe i organizacyjne
    /\b(kontakt|adres|telefon|email|siedziba)\b/i
  ];
  
  // Sprawdź, czy zapytanie zawiera URL
  const urlPattern = /https?:\/\/[^\s]+/i;
  const hasUrl = urlPattern.test(query);
  
  if (hasUrl) {
    console.log("✅ Znaleziono URL w zapytaniu - wymaga wyszukiwania");
    return true;
  }
  
  // Sprawdź, czy zapytanie pasuje do wzorców wyszukiwania
  const matchesPattern = searchPatterns.some(pattern => {
    const matches = pattern.test(query);
    if (matches) {
      console.log(`✅ Zapytanie pasuje do wzorca: ${pattern.source}`);
    }
    return matches;
  });
  
  // Dodatkowe sprawdzenie dla konkretnych fraz
  const specificPhrases = [
    'ile kosztuje',
    'jaka jest cena',
    'gdzie mogę',
    'jak się dostać',
    'kiedy jest',
    'czy jest dostępne',
    'aktualny status',
    'najnowsze informacje'
  ];
  
  const matchesSpecificPhrase = specificPhrases.some(phrase => {
    const matches = query.toLowerCase().includes(phrase);
    if (matches) {
      console.log(`✅ Zapytanie zawiera frazę wymagającą wyszukiwania: "${phrase}"`);
    }
    return matches;
  });
  
  const shouldSearch = matchesPattern || matchesSpecificPhrase;
  
  console.log(`${shouldSearch ? '✅' : '❌'} Wynik analizy: ${shouldSearch ? 'WYMAGA' : 'NIE WYMAGA'} wyszukiwania`);
  
  return shouldSearch;
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
 * POPRAWIONA WERSJA - robi jedno zapytanie dla wszystkich dokumentów
 */
async function getDocumentsContent(documentIds: string[]): Promise<string> {
  if (documentIds.length === 0) return "";
  
  try {
    console.log("📚 === START getDocumentsContent ===");
    console.log("📋 Pobieranie treści dokumentów:", documentIds);
    
    // 🔥 POPRAWKA 1: Jedno zapytanie dla wszystkich dokumentów z biblioteki wiedzy
    try {
      const url = `/api/knowledge/documents/content?ids=${documentIds.join(',')}`;
      console.log(`📡 Wywołuję API biblioteki wiedzy: ${url}`);
      
      const response = await fetch(url);
      console.log(`📨 Status odpowiedzi biblioteki wiedzy: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📄 Odpowiedź API biblioteki wiedzy:`, {
          hasDocuments: !!data.documents,
          documentsCount: data.documents?.length || 0,
          success: data.success
        });
        
        if (data.documents && data.documents.length > 0) {
          console.log(`✅ Znaleziono ${data.documents.length} dokumentów w bibliotece wiedzy`);
          
          let documentsText = "";
          
          for (const doc of data.documents) {
            if (doc.content) {
              const docText = `\n### Dokument: "${doc.title || 'Bez tytułu'}" (${doc.fileType || 'nieznany'})\n\n${doc.content}\n\n`;
              documentsText += docText;
              console.log(`➕ Dodano dokument "${doc.title}" - długość: ${doc.content.length} znaków`);
            } else {
              console.warn(`⚠️ Dokument ${doc.id} "${doc.title}" nie zawiera treści`);
            }
          }
          
          console.log(`📚 === END getDocumentsContent ===`);
          console.log(`📊 FINAL: Zwracam treść ${data.documents.length} dokumentów, łączna długość: ${documentsText.length} znaków`);
          
          if (documentsText.length > 0) {
            console.log(`📝 Pierwsze 200 znaków: ${documentsText.substring(0, 200)}...`);
            return documentsText;
          }
        } else {
          console.log(`⚠️ API biblioteki wiedzy zwróciło pustą listę dokumentów`);
        }
      } else {
        console.log(`❌ Błąd HTTP ${response.status} z biblioteki wiedzy`);
        const errorText = await response.text();
        console.log(`❌ Treść błędu: ${errorText}`);
      }
    } catch (error) {
      console.warn(`❌ Błąd podczas pobierania z biblioteki wiedzy:`, error);
    }
    
    // 🔥 POPRAWKA 2: Fallback do starych dokumentów z czatu (jedno za razem)
    console.log(`🔄 Próba pobrania dokumentów z czatu jako fallback...`);
    
    const documentPromises = documentIds.map(async (docId) => {
      console.log(`🔍 Próba pobrania dokumentu z czatu: ${docId}`);
      return getDocument(docId);
    });
    
    const documents = await Promise.all(documentPromises);
    const validDocuments = documents.filter(doc => {
      const isValid = doc !== null && doc !== undefined && doc.content;
      console.log(`🔍 Dokument ${doc?.id || 'unknown'} z czatu valid: ${isValid}, content length: ${doc?.content?.length || 0}`);
      return isValid;
    });
    
    if (validDocuments.length > 0) {
      console.log(`✅ Znaleziono ${validDocuments.length} dokumentów w czacie`);
      
      let documentsText = "";
      
      for (const doc of validDocuments) {
        if (doc.content) {
          const docText = `\n### Dokument: "${doc.title || 'Bez tytułu'}" (${doc.fileType || 'nieznany'})\n\n${doc.content}\n\n`;
          documentsText += docText;
          console.log(`➕ Dodano dokument z czatu "${doc.title}" - długość: ${doc.content.length} znaków`);
        }
      }
      
      console.log(`📚 === END getDocumentsContent (czat fallback) ===`);
      console.log(`📊 FINAL: Zwracam treść ${validDocuments.length} dokumentów z czatu, łączna długość: ${documentsText.length} znaków`);
      
      return documentsText;
    }
    
    console.log(`❌ Nie znaleziono żadnych dokumentów z treścią`);
    return "";
    
  } catch (error) {
    console.error('❌ KRYTYCZNY BŁĄD podczas pobierania treści dokumentów:', error);
    return "";
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

    // ZMIENIONY SYSTEM PROMPT - Bardziej uniwersalny
    const systemPrompt = `Jesteś pomocnym i wszechstronnym asystentem AI. Potrafisz odpowiadać na szeroki zakres pytań i pomagać w różnorodnych zadaniach. Odpowiadasz zawsze po polsku, zwięźle i rzeczowo.

Możesz pomagać w:
- Projektach UE i dokumentacji projektowej (to jest Twoja specjalizacja)
- Odpowiadaniu na pytania ogólne
- Analizie dokumentów i danych
- Rozwiązywaniu problemów
- Edukacji i wyjaśnianiu pojęć
- Tworzeniu treści
- Planowaniu i organizacji
- Wsparciu technicznym
- I wielu innych obszarach

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
- Odpowiadaj na wszystkie rozsądne pytania w ramach swoich możliwości
- Bądź pomocny, dokładny i rzetelny
- Jeśli nie znasz odpowiedzi, powiedz o tym szczerze
- Dostosuj ton i poziom szczegółowości do pytania
- Zachowuj profesjonalizm przy jednoczesnej życzliwości
- Jeśli pytanie dotyczy szkodliwych, nielegalnych lub nieetycznych działań, grzecznie odmów i zaproponuj konstruktywne alternatywy`;

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
    console.log(`🔍 Wykonuję wyszukiwanie dla: "${query}"`);
    
    const response = await fetch('/api/web-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Błąd wyszukiwania: ${response.status} - ${errorData.error || 'Nieznany błąd'}`);
    }

    const searchData = await response.json();
    
    console.log(`✅ Znaleziono ${searchData.totalResults} wyników dla: "${query}"`);
    
    return {
      query: searchData.query,
      results: searchData.results || [],
      totalResults: searchData.totalResults || 0,
      source: searchData.source || 'unknown'
    };
    
  } catch (error) {
    console.error("❌ Błąd wyszukiwania:", error);
    
    // Zwróć uproszczoną odpowiedź w przypadku błędu
    return {
      query,
      results: [],
      totalResults: 0,
      error: error instanceof Error ? error.message : "Nie udało się wykonać wyszukiwania",
      source: 'error'
    };
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
    // 🔥 POPRAWKA: Pobierz treść dokumentów PRZED przygotowaniem promptu
    let documentsContext = "";
    if (documentIds.length > 0) {
      console.log(`📚 Pobieranie treści ${documentIds.length} dokumentów...`);
      documentsContext = await getDocumentsContent(documentIds);
      console.log(`📊 Otrzymano kontekst dokumentów o długości: ${documentsContext.length} znaków`);
      
      if (documentsContext.length > 0) {
        console.log(`📝 Pierwsze 200 znaków kontekstu: ${documentsContext.substring(0, 200)}...`);
      } else {
        console.warn(`⚠️ Kontekst dokumentów jest pusty mimo ${documentIds.length} ID`);
      }
    }

    // Sprawdź, czy zapytanie może wymagać wyszukiwania w sieci
    const shouldUseWebSearch = enableWebSearch && shouldSearchWeb(prompt);
    
    console.log(`🔍 Analiza zapytania: "${prompt}"`);
    console.log(`📊 Wyszukiwanie włączone: ${enableWebSearch}`);
    console.log(`🔍 Czy użyć wyszukiwania: ${shouldUseWebSearch}`);

    // ZAKTUALIZOWANY SYSTEM PROMPT z lepszą obsługą wyszukiwania
    const systemPrompt = `Jesteś pomocnym i wszechstronnym asystentem AI o nazwie MarsoftAI. 

Twoje główne kompetencje:
- Specjalizujesz się w projektach UE i dokumentacji projektowej
- Potrafisz odpowiadać na szeroki zakres pytań z różnych dziedzin
- Analizujesz dokumenty i dane
- Pomagasz w programowaniu, naukach, biznesie i wielu innych obszarach

${enableWebSearch 
  ? `🌐 WYSZUKIWANIE W INTERNECIE: WŁĄCZONE
Masz dostęp do aktualnych informacji z internetu. Gdy potrzebujesz najnowszych danych, aktualnych cen, bieżących wydarzeń lub informacji, które mogły się zmienić od Twojej ostatniej aktualizacji wiedzy, użyj funkcji wyszukiwania.

KIEDY UŻYWAĆ WYSZUKIWANIA:
- Aktualne ceny, kursy walut, notowania giełdowe
- Najnowsze wiadomości i wydarzenia
- Bieżące regulacje prawne i przepisy UE
- Aktualne programy finansowania UE
- Terminy naborów i konkursów
- Sprawdzanie dat, terminów, aktualnych statusów
- Weryfikacja aktualnych informacji kontaktowych
- Sprawdzanie dostępności stron internetowych` 
  : `🌐 WYSZUKIWANIE W INTERNECIE: WYŁĄCZONE
Nie masz dostępu do internetu. Opieraj się tylko na swojej wewnętrznej wiedzy i udostępnionych dokumentach.`}

FORMATOWANIE ODPOWIEDZI (Markdown):
1. Listy punktowane: używaj myślników (-) w nowych liniach
2. Listy numerowane: 1., 2., itd. w nowych liniach  
3. Nagłówki: ## dla głównych sekcji, ### dla podsekcji
4. Pogrubienia: **tekst** dla ważnych terminów
5. Wydzielaj sekcje pustymi liniami
${enableWebSearch ? '6. Źródła internetowe: zawsze podawaj linki do źródeł' : ''}

ZASADY:
- Odpowiadaj dokładnie i rzetelnie
- Dostosuj ton do charakteru pytania  
- Jeśli nie znasz odpowiedzi, powiedz to szczerze
- Bazuj na udostępnionych dokumentach jako priorytet
- Zachowaj profesjonalizm i życzliwość

${documentsContext ? '**WAŻNE: Masz dostęp do dokumentów referencyjnych. Bazuj na nich w pierwszej kolejności przy odpowiadaniu na pytania.**' : ''}`;
    
    // 🔥 POPRAWKA: Poprawnie skonstruuj prompt z dokumentami
    let userPromptWithContext = prompt;
    
    // Dodaj kontekst dokumentów jeśli istnieją
    if (documentsContext) {
      userPromptWithContext = `📋 DOKUMENTY REFERENCYJNE:
${documentsContext}

💬 PYTANIE UŻYTKOWNIKA: ${prompt}

Odpowiedz na pytanie bazując przede wszystkim na dostarczonych dokumentach. Jeśli informacje w dokumentach nie są wystarczające, uzupełnij je swoją wiedzą${enableWebSearch ? ' lub wyszukiwaniem w internecie' : ''}.`;
      
      console.log(`✅ Dodano kontekst dokumentów do promptu (długość: ${documentsContext.length} znaków)`);
    }

    let searchResults = "";
    
    // Wykonaj wyszukiwanie jeśli jest potrzebne
    if (shouldUseWebSearch) {
      console.log("🔍 Wykonuję wyszukiwanie w internecie...");
      
      const searchData = await performSearch(prompt);
      
      if (searchData.results && searchData.results.length > 0) {
        searchResults = `\n\n🌐 WYNIKI WYSZUKIWANIA W INTERNECIE dla "${searchData.query}":\n\n`;
        
        searchData.results.forEach((result: any, index: number) => {
          searchResults += `${index + 1}. **${result.title}**\n`;
          searchResults += `   URL: ${result.url}\n`;
          searchResults += `   Opis: ${result.snippet}\n`;
          if (result.published) {
            searchResults += `   Data: ${result.published}\n`;
          }
          searchResults += `\n`;
        });
        
        searchResults += `Źródło wyszukiwania: ${searchData.source}\n`;
        console.log(`✅ Dodano ${searchData.results.length} wyników wyszukiwania do kontekstu`);
      } else if (searchData.error) {
        searchResults = `\n\n⚠️ Błąd wyszukiwania: ${searchData.error}\n`;
        console.log(`❌ Błąd wyszukiwania: ${searchData.error}`);
      }
    }

    // 🔥 POPRAWKA: Połącz wszystkie konteksty POPRAWNIE
    const finalPrompt = userPromptWithContext + searchResults;

    console.log(`📝 Wysyłam zapytanie do OpenAI:`);
    console.log(`   - Długość promptu: ${finalPrompt.length} znaków`);
    console.log(`   - Ma dokumenty: ${documentsContext.length > 0}`);
    console.log(`   - Ma wyszukiwanie: ${searchResults.length > 0}`);

    // Wysłanie zapytania do OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Użyj najnowszego modelu
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4096
    });

    const rawResponse = response.choices[0]?.message?.content || "Przepraszam, nie udało się wygenerować odpowiedzi.";
    
    console.log(`✅ Otrzymano odpowiedź od OpenAI (długość: ${rawResponse.length} znaków)`);
    
    // Popraw formatowanie Markdown przed zwróceniem odpowiedzi
    return improveMarkdownFormatting(rawResponse);
    
  } catch (error) {
    console.error('❌ Błąd podczas pobierania odpowiedzi z OpenAI:', error);
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

export { openai };