// src/lib/openai-service.ts - KOMPLETNA NAPRAWIONA WERSJA
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';

// Konfiguracja OpenAI
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
 * ✅ NAPRAWIONA funkcja pobierania dokumentów z biblioteki wiedzy
 */
async function getDocumentsContent(documentIds: string[]): Promise<string> {
  if (documentIds.length === 0) {
    console.log("📚 Brak dokumentów do pobrania");
    return "";
  }
  
  try {
    console.log("📚 === START getDocumentsContent ===");
    console.log("📋 Pobieranie treści dokumentów:", documentIds);
    
    // ✅ NAPRAWIONE zapytanie do API z lepszą obsługą błędów
    const url = `/api/knowledge/documents/content?ids=${encodeURIComponent(documentIds.join(','))}`;
    console.log(`📡 Wywołuję API biblioteki wiedzy: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      credentials: 'include'
    });
    
    console.log(`📨 Status odpowiedzi: ${response.status} ${response.statusText}`);
    
    // ✅ LEPSZA obsługa błędów HTTP
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Błąd HTTP ${response.status}:`, errorText);
      
      if (response.status === 401) {
        console.error("❌ Problem z autoryzacją - użytkownik nie jest zalogowany");
        throw new Error("Problem z autoryzacją. Zaloguj się ponownie.");
      } else if (response.status === 403) {
        console.error("❌ Brak uprawnień do dokumentów");
        throw new Error("Brak uprawnień do żądanych dokumentów.");
      } else {
        throw new Error(`Błąd serwera: ${response.status} - ${errorText}`);
      }
    }
    
    const data = await response.json();
    console.log(`📄 Odpowiedź API:`, {
      success: data.success,
      documentsCount: data.documents?.length || 0,
      totalContentLength: data.totalContentLength || 0,
      hasStats: !!data.stats
    });
    
    // ✅ SZCZEGÓŁOWA walidacja odpowiedzi
    if (!data.success) {
      console.error("❌ API zwróciło success: false:", data.error || "Nieznany błąd");
      throw new Error(data.error || "API zwróciło błąd");
    }
    
    if (!data.documents || !Array.isArray(data.documents)) {
      console.error("❌ API nie zwróciło tablicy dokumentów:", typeof data.documents);
      throw new Error("Nieprawidłowa struktura odpowiedzi z API");
    }
    
    if (data.documents.length === 0) {
      console.warn("⚠️ API zwróciło pustą listę dokumentów");
      console.warn("⚠️ Przyczyny:", data.debug || "Brak szczegółów debugowania");
      return ""; // To nie jest błąd - po prostu brak dostępnych dokumentów
    }
    
    console.log(`✅ Znaleziono ${data.documents.length} dokumentów w bibliotece wiedzy`);
    
    // ✅ NAPRAWIONE przetwarzanie dokumentów z lepszą diagnostyką
    let documentsText = "";
    let documentsProcessed = 0;
    let documentsWithContent = 0;
    let documentsWithIssues = 0;
    
    for (const doc of data.documents) {
      documentsProcessed++;
      
      console.log(`📄 Przetwarzam dokument ${documentsProcessed}/${data.documents.length}:`);
      console.log(`   📝 ID: ${doc.id}`);
      console.log(`   📖 Tytuł: ${doc.title || 'Bez tytułu'}`);
      console.log(`   📁 Typ: ${doc.fileType || 'nieznany'}`);
      console.log(`   📏 Długość zawartości: ${doc.content?.length || 0} znaków`);
      console.log(`   ⚠️ Status: ${doc.contentStatus || 'nieznany'}`);
      
      if (!doc.content) {
        console.warn(`   ❌ Brak zawartości w dokumencie ${doc.id}`);
        documentsWithIssues++;
        
        // Dodaj informację o braku zawartości
        documentsText += `\n### ❌ Dokument: "${doc.title || 'Bez tytułu'}" (${doc.fileType || 'nieznany'})\n\n`;
        documentsText += `**PROBLEM:** Dokument nie zawiera tekstu do analizy.\n`;
        documentsText += `**ID:** ${doc.id}\n`;
        documentsText += `**Plik:** ${doc.originalFileName || 'nieznany'}\n\n`;
        
      } else if (doc.content.trim().length === 0) {
        console.warn(`   ⚠️ Pusta zawartość w dokumencie ${doc.id}`);
        documentsWithIssues++;
        
        documentsText += `\n### ⚠️ Dokument: "${doc.title || 'Bez tytułu'}" (${doc.fileType || 'nieznany'})\n\n`;
        documentsText += `**PROBLEM:** Dokument ma pustą zawartość.\n\n`;
        
      } else {
        // ✅ Dokument ma zawartość
        documentsWithContent++;
        
        const docHeader = `\n### 📄 Dokument: "${doc.title || 'Bez tytułu'}" (${doc.fileType || 'nieznany'})\n\n`;
        
        // Dodaj metadata jeśli dostępne
        if (doc.originalFileName && doc.originalFileName !== doc.title) {
          documentsText += docHeader + `**Plik:** ${doc.originalFileName}\n`;
        } else {
          documentsText += docHeader;
        }
        
        if (doc.uploadedBy) {
          documentsText += `**Przesłane przez:** ${doc.uploadedBy}\n`;
        }
        
        if (doc.categoryName) {
          documentsText += `**Kategoria:** ${doc.categoryName}\n`;
        }
        
        // Dodaj ostrzeżenie o awaryjnej zawartości
        if (doc.contentStatus && doc.contentStatus !== 'OK') {
          documentsText += `**⚠️ Uwaga:** ${getContentStatusDescription(doc.contentStatus)}\n`;
        }
        
        documentsText += `\n**Zawartość:**\n\n${doc.content}\n\n`;
        
        console.log(`   ✅ Dodano dokument - ${doc.content.length} znaków`);
      }
    }
    
    // ✅ SZCZEGÓŁOWE podsumowanie
    console.log(`📊 === PODSUMOWANIE PRZETWARZANIA ===`);
    console.log(`   📄 Przetworzonych dokumentów: ${documentsProcessed}`);
    console.log(`   ✅ Z prawidłową zawartością: ${documentsWithContent}`);
    console.log(`   ⚠️ Z problemami: ${documentsWithIssues}`);
    console.log(`   📏 Łączna długość tekstu: ${documentsText.length} znaków`);
    
    if (data.stats) {
      console.log(`📊 Statystyki z API:`, data.stats);
    }
    
    // ✅ POKAŻ próbkę treści dla debugowania
    if (documentsText.length > 0) {
      const preview = documentsText.substring(0, 300).replace(/\n/g, ' ');
      console.log(`📖 Próbka treści: "${preview}..."`);
    }
    
    console.log("📚 === END getDocumentsContent ===");
    
    return documentsText;
    
  } catch (error) {
    console.error('❌ === BŁĄD getDocumentsContent ===');
    console.error('❌ Szczegóły błędu:', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : 'No stack trace'
    });
    
    // ✅ NIE rzucaj błędu - zwróć pusty string i pozwól działać dalej
    console.log("📚 Zwracam pusty string z powodu błędu - aplikacja będzie działać bez dokumentów");
    return "";
  }
}

/**
 * ✅ NOWA funkcja pomocnicza do opisu statusu zawartości
 */
function getContentStatusDescription(status: string): string {
  switch (status) {
    case 'EMERGENCY_CONTENT':
      return 'Zawartość została wygenerowana automatycznie z metadanych pliku';
    case 'SCANNED_PDF':
      return 'PDF skanowany - tekst wyekstrahowany może być niepełny';
    case 'FALLBACK_USED':
      return 'Użyto zapasowej metody ekstrakcji tekstu';
    case 'EXTRACTION_ERROR':
      return 'Wystąpił błąd podczas ekstraktowania tekstu';
    default:
      return `Status: ${status}`;
  }
}

/**
 * Pobiera dokument z bazy danych na podstawie ID (fallback dla starych dokumentów)
 */
async function getDocument(documentId: string): Promise<any> {
  try {
    console.log(`📄 Pobieranie starego dokumentu z czatu ID: ${documentId}`);
    
    const response = await fetch(`/api/documents/${documentId}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error(`❌ Błąd pobierania dokumentu ${documentId}:`, response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    console.log(`✅ Pobrany stary dokument:`, {
      id: data.document?.id,
      title: data.document?.title,
      hasContent: !!(data.document?.content)
    });
    
    return data.document;
  } catch (error) {
    console.error(`❌ Błąd podczas pobierania dokumentu ${documentId}:`, error);
    return null;
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
 * ✅ GŁÓWNA NAPRAWIONA funkcja do pobierania odpowiedzi od OpenAI z możliwością wyszukiwania w sieci
 */
export async function getOpenAIResponseWithWebSearch(
  prompt: string, 
  documentIds: string[] = [],
  enableWebSearch: boolean = true
): Promise<string> {
  try {
    console.log("🤖 === START getOpenAIResponseWithWebSearch ===");
    console.log(`📝 Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
    console.log(`📚 DocumentIds (${documentIds.length}):`, documentIds);
    console.log(`🌐 WebSearch enabled: ${enableWebSearch}`);
    
    // ✅ POPRAWIONE pobieranie treści dokumentów
    let documentsContext = "";
    if (documentIds.length > 0) {
      console.log(`📚 Pobieranie treści ${documentIds.length} dokumentów...`);
      
      try {
        documentsContext = await getDocumentsContent(documentIds);
        console.log(`📊 Otrzymano kontekst dokumentów: ${documentsContext.length} znaków`);
        
        if (documentsContext.length > 0) {
          console.log(`📝 Pierwsze 200 znaków kontekstu: "${documentsContext.substring(0, 200)}..."`);
        } else {
          console.warn(`⚠️ Kontekst dokumentów jest pusty mimo ${documentIds.length} ID`);
        }
      } catch (docError) {
        console.error(`❌ Błąd pobierania dokumentów:`, docError);
        console.log(`🔄 Kontynuuję bez dokumentów...`);
        documentsContext = "";
      }
    }

    // Sprawdź potrzebę wyszukiwania
    const shouldUseWebSearch = enableWebSearch && shouldSearchWeb(prompt);
    console.log(`🔍 Czy użyć wyszukiwania: ${shouldUseWebSearch}`);

    // ✅ ZAKTUALIZOWANY system prompt
    const systemPrompt = `Jesteś pomocnym i wszechstronnym asystentem AI o nazwie MarsoftAI.

Twoje główne kompetencje:
- Specjalizujesz się w projektach UE i dokumentacji projektowej
- Potrafisz odpowiadać na szeroki zakres pytań z różnych dziedzin
- Analizujesz dokumenty i dane
- Pomagasz w programowaniu, naukach, biznesie i wielu innych obszarach

${enableWebSearch 
  ? `🌐 WYSZUKIWANIE W INTERNECIE: WŁĄCZONE
Masz dostęp do aktualnych informacji z internetu. Gdy potrzebujesz najnowszych danych, użyj funkcji wyszukiwania.`
  : `🌐 WYSZUKIWANIE W INTERNECIE: WYŁĄCZONE
Nie masz dostępu do internetu. Opieraj się na swojej wiedzy i udostępnionych dokumentach.`}

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
    
    // ✅ POPRAWNIE skonstruuj prompt użytkownika
    let userPromptWithContext = prompt;
    
    if (documentsContext) {
      userPromptWithContext = `📋 DOKUMENTY REFERENCYJNE:
${documentsContext}

💬 PYTANIE UŻYTKOWNIKA: ${prompt}

Odpowiedz na pytanie bazując przede wszystkim na dostarczonych dokumentach. Jeśli informacje w dokumentach nie są wystarczające, uzupełnij je swoją wiedzą${enableWebSearch ? ' lub wyszukiwaniem w internecie' : ''}.`;
      
      console.log(`✅ Dodano kontekst dokumentów do promptu (${documentsContext.length} znaków)`);
    }

    // ✅ Wykonaj wyszukiwanie jeśli potrzebne
    let searchResults = "";
    if (shouldUseWebSearch) {
      console.log("🔍 Wykonuję wyszukiwanie w internecie...");
      
      try {
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
          console.log(`✅ Dodano ${searchData.results.length} wyników wyszukiwania`);
        } else if (searchData.error) {
          searchResults = `\n\n⚠️ Błąd wyszukiwania: ${searchData.error}\n`;
          console.log(`❌ Błąd wyszukiwania: ${searchData.error}`);
        }
      } catch (searchError) {
        console.error(`❌ Błąd wyszukiwania:`, searchError);
        searchResults = `\n\n⚠️ Nie udało się wykonać wyszukiwania: ${searchError instanceof Error ? searchError.message : 'Nieznany błąd'}\n`;
      }
    }

    // ✅ Połącz wszystkie konteksty
    const finalPrompt = userPromptWithContext + searchResults;

    console.log(`📝 Wysyłam zapytanie do OpenAI:`);
    console.log(`   - Długość promptu: ${finalPrompt.length} znaków`);
    console.log(`   - Ma dokumenty: ${documentsContext.length > 0}`);
    console.log(`   - Ma wyszukiwanie: ${searchResults.length > 0}`);

    // ✅ Wywołanie OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4096
    });

    const rawResponse = response.choices[0]?.message?.content || "Przepraszam, nie udało się wygenerować odpowiedzi.";
    
    console.log(`✅ Otrzymano odpowiedź od OpenAI (${rawResponse.length} znaków)`);
    console.log("🤖 === END getOpenAIResponseWithWebSearch ===");
    
    return improveMarkdownFormatting(rawResponse);
    
  } catch (error) {
    console.error('❌ === BŁĄD getOpenAIResponseWithWebSearch ===');
    console.error('❌ Szczegóły:', error);
    
    return "Przepraszam, wystąpił błąd podczas przetwarzania Twojego zapytania. Spróbuj ponownie później.";
  }
}

/**
 * Funkcja do pobierania odpowiedzi od OpenAI (backward compatibility)
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
      model: "gpt-4o-2024-08-06",
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
      credentials: 'include',
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
      credentials: 'include',
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
 * Funkcja do analizy tekstu wyekstrahowanego z PDF z wykorzystaniem OpenAI
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
      credentials: 'include',
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
 */
export async function handleDocumentGeneration(
  prompt: string,
  chatId: string
): Promise<{ text: string; pdfUrl?: string; documentId?: string }> {
  // 🔥 NAPRAWIONE WZORCE - bardziej precyzyjne wykrywanie
  const generateDocumentPatterns = [
    // TYLKO bezpośrednie polecenia generowania dokumentów
    /(?:wygeneruj|stwórz|przygotuj|utwórz|zrób)\s+(?:dla\s+mnie\s+)?(?:dokument|pdf|plik\s+pdf|raport)/i,
    /(?:zapisz|wyeksportuj)(?:\s+to)?\s+(?:jako|do|w)\s+(?:pdf|dokument|plik)/i,
    /(?:sporządź|generuj|wykonaj)\s+(?:dla\s+mnie\s+)?(?:dokument|raport|pdf)/i,
    
    // Bezpośrednie żądania z listami/tabelami + polecenie tworzenia
    /(?:stwórz|przygotuj|wygeneruj)\s+(?:dla\s+mnie\s+)?(?:listę|zestawienie|tabelę|wykaz)/i,
    /(?:zrób|utwórz|stwórz)\s+(?:dla\s+mnie\s+)?(?:listę|zestawienie|tabelę|wykaz|podsumowanie)/i,
    
    // Formalne dokumenty + polecenie tworzenia
    /(?:przygotuj|wygeneruj|stwórz)\s+(?:dla\s+mnie\s+)?(?:ofertę|umowę|sprawozdanie|analizę)/i,
    /(?:napisz|przygotuj)\s+(?:dla\s+mnie\s+)?(?:protokół|zarys|kosztorys|specyfikację)/i,
    
    // Grzeczne prośby o dokumenty
    /(?:uprzejmie\s+proszę\s+o\s+przygotowanie|czy\s+mógłbyś\s+przygotować)\s+(?:dla\s+mnie\s+)?(?:dokumentu|raportu|pliku|pdf)/i,
    /(?:potrzebuję|chciałbym)\s+(?:otrzymać\s+)?(?:dokument|raport|plik\s+pdf|zestawienie)/i,
    
    // 🔥 DODAJ: Bezpośrednie polecenia z PDF
    /(?:zrób|wygeneruj|stwórz)\s+(?:dla\s+mnie\s+)?(?:pdf|plik\s+pdf|dokument\s+pdf)/i
  ];
  
  // Sprawdź, czy zapytanie pasuje do któregokolwiek z wzorców
  let isDocumentRequest = generateDocumentPatterns.some(pattern => pattern.test(prompt));
  
  // 🔥 USUŃ TĘ CZĘŚĆ - była zbyt liberalna:
  // Usunięto sprawdzanie kontekstowe dla prostszych fraz
  
  // 🔥 DODAJ: Tylko jeśli zawiera wyraźne słowa kluczowe generowania
  if (!isDocumentRequest) {
    // Sprawdź tylko bardzo wyraźne przypadki
    const explicitGenerationWords = /(?:wygeneruj|stwórz|przygotuj|utwórz|zrób|sporządź|napisz|wykonaj)/i;
    const documentWords = /(?:dokument|pdf|raport|lista|zestawienie|tabela|wykaz|oferta|umowa|protokół)/i;
    
    if (explicitGenerationWords.test(prompt) && documentWords.test(prompt)) {
      console.log("Wykryto wyraźne żądanie generowania dokumentu:", prompt);
      isDocumentRequest = true;
    }
  }
  
  if (!isDocumentRequest) {
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

// Eksporty
export { 
  openai,
  shouldSearchWeb,
  getDocumentsContent,
  improveMarkdownFormatting
};