// src/lib/openai-service-extended.ts
import OpenAI from 'openai';
import { 
  openai, 
  getDocumentsContent, 
  improveMarkdownFormatting 
} from './openai-service';

// Typy dla procesu myślowego
export interface ReasoningStep {
  id: string;
  title: string;
  content: string;
  type: 'analysis' | 'planning' | 'execution' | 'verification';
}

export interface ExtendedResponse {
  response: string;
  reasoning?: {
    steps: ReasoningStep[];
    finalAnswer: string;
  };
}

/**
 * System prompt dla rozszerzonego myślenia
 */
const getExtendedReasoningSystemPrompt = (enableWebSearch: boolean, hasDocuments: boolean): string => {
  return `Jesteś zaawansowanym asystentem AI o nazwie MarsoftAI z możliwością rozszerzonego myślenia.

TRYB ROZSZERZONEGO MYŚLENIA:
Gdy użytkownik zadaje pytanie, najpierw przedstaw swój proces myślowy w strukturze JSON, a następnie podaj finalną odpowiedź.

STRUKTURA PROCESU MYŚLOWEGO:
\`\`\`json
{
  "reasoning_process": {
    "steps": [
      {
        "id": "1",
        "title": "Analiza problemu",
        "content": "Szczegółowe zrozumienie pytania, identyfikacja kluczowych elementów",
        "type": "analysis"
      },
      {
        "id": "2", 
        "title": "Planowanie podejścia",
        "content": "Określenie strategii rozwiązania, jakie informacje są potrzebne",
        "type": "planning"
      },
      {
        "id": "3",
        "title": "Wykonanie analizy",
        "content": "Krok po kroku rozwiązywanie problemu, analiza danych",
        "type": "execution"
      },
      {
        "id": "4",
        "title": "Weryfikacja i synteza",
        "content": "Sprawdzenie poprawności, połączenie wyników w spójną całość",
        "type": "verification"
      }
    ]
  }
}
\`\`\`

TYPY KROKÓW:
- "analysis": Analiza problemu, zrozumienie kontekstu
- "planning": Planowanie strategii rozwiązania  
- "execution": Wykonanie konkretnych działań/analiz
- "verification": Weryfikacja wyników i synteza

ZASADY PROCESU MYŚLOWEGO:
1. Każdy krok powinien być konkretny i szczegółowy
2. Używaj minimum 3, maksimum 6 kroków
3. Dostosuj liczbę kroków do złożoności problemu
4. W każdym kroku wyjaśnij swoje rozumowanie
5. Pokazuj jak dochodzisz do wniosków

${enableWebSearch 
  ? `🌐 WYSZUKIWANIE: Masz dostęp do internetu - wykorzystuj aktualne dane.`
  : `🌐 WYSZUKIWANIE: Wyłączone - używaj tylko własnej wiedzy.`}

${hasDocuments 
  ? `📚 DOKUMENTY: Masz dostęp do dokumentów - analizuj je w pierwszej kolejności.`
  : ''}

FORMATOWANIE KOŃCOWEJ ODPOWIEDZI:
Po przedstawieniu procesu myślowego podaj finalną odpowiedź w formacie Markdown:
- Używaj nagłówków (## ###)
- Listy punktowane (-) i numerowane (1.)
- Pogrubienia (**tekst**)
- Kod w backtickach
- Tabele gdy potrzebne

Twoja specjalizacja to projekty UE i dokumentacja, ale odpowiadasz na wszystkie rozsądne pytania.`;
};

/**
 * Parsowanie odpowiedzi z procesem myślowym
 */
function parseReasoningResponse(response: string): ExtendedResponse {
  try {
    // Szukaj bloku JSON z procesem myślowym
    const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    
    if (!jsonMatch) {
      // Brak struktury JSON - zwróć standardową odpowiedź
      return {
        response: improveMarkdownFormatting(response)
      };
    }

    const jsonStr = jsonMatch[1];
    const reasoningData = JSON.parse(jsonStr);
    
    // Pobierz część odpowiedzi po bloku JSON
    const afterJsonIndex = response.indexOf('```', response.indexOf(jsonStr) + jsonStr.length) + 3;
    let finalAnswer = response.substring(afterJsonIndex).trim();
    
    // Jeśli brak finalnej odpowiedzi po JSON, użyj całej odpowiedzi
    if (!finalAnswer) {
      finalAnswer = response.replace(/```json[\s\S]*?```/g, '').trim();
    }

    // Walidacja struktury procesu myślowego
    if (!reasoningData.reasoning_process?.steps || !Array.isArray(reasoningData.reasoning_process.steps)) {
      console.warn("Nieprawidłowa struktura procesu myślowego, używam standardowej odpowiedzi");
      return {
        response: improveMarkdownFormatting(response)
      };
    }

    // Konwersja kroków do wymaganego formatu
    const steps: ReasoningStep[] = reasoningData.reasoning_process.steps.map((step: any, index: number) => ({
      id: step.id || String(index + 1),
      title: step.title || `Krok ${index + 1}`,
      content: step.content || "Brak treści",
      type: ['analysis', 'planning', 'execution', 'verification'].includes(step.type) 
        ? step.type 
        : 'analysis'
    }));

    return {
      response: improveMarkdownFormatting(finalAnswer),
      reasoning: {
        steps,
        finalAnswer: improveMarkdownFormatting(finalAnswer)
      }
    };

  } catch (error) {
    console.error("Błąd parsowania procesu myślowego:", error);
    // W przypadku błędu zwróć standardową odpowiedź
    return {
      response: improveMarkdownFormatting(response)
    };
  }
}

/**
 * Główna funkcja z rozszerzonym myśleniem
 */
export async function getOpenAIResponseWithExtendedReasoning(
  prompt: string,
  documentIds: string[] = [],
  enableWebSearch: boolean = true,
  enableExtendedReasoning: boolean = false
): Promise<ExtendedResponse> {
  try {
    console.log("🧠 === START getOpenAIResponseWithExtendedReasoning ===");
    console.log(`📝 Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
    console.log(`📚 DocumentIds: ${documentIds.length}`);
    console.log(`🌐 WebSearch: ${enableWebSearch}`);
    console.log(`🧠 ExtendedReasoning: ${enableExtendedReasoning}`);

    // Pobierz kontekst dokumentów
    let documentsContext = "";
    if (documentIds.length > 0) {
      console.log(`📚 Pobieranie treści ${documentIds.length} dokumentów...`);
      documentsContext = await getDocumentsContent(documentIds);
      console.log(`📊 Otrzymano kontekst dokumentów: ${documentsContext.length} znaków`);
    }

    // Przygotuj system prompt
    const systemPrompt = enableExtendedReasoning 
      ? getExtendedReasoningSystemPrompt(enableWebSearch, documentsContext.length > 0)
      : getStandardSystemPrompt(enableWebSearch, documentsContext.length > 0);

    // Przygotuj prompt użytkownika z kontekstem
    let userPromptWithContext = prompt;
    
    if (documentsContext) {
      userPromptWithContext = `📋 DOKUMENTY REFERENCYJNE:
${documentsContext}

💬 PYTANIE UŻYTKOWNIKA: ${prompt}

${enableExtendedReasoning 
  ? 'Najpierw przedstaw swój proces myślowy w formacie JSON, a następnie podaj finalną odpowiedź.' 
  : 'Odpowiedz na pytanie bazując na dostarczonych dokumentach.'}`;
    } else if (enableExtendedReasoning) {
      userPromptWithContext = `${prompt}

Przedstaw swój proces myślowy w formacie JSON, a następnie podaj finalną odpowiedź.`;
    }

    console.log(`📝 Wysyłam zapytanie do OpenAI (Extended: ${enableExtendedReasoning})`);

    // Wywołanie OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPromptWithContext }
      ],
      temperature: enableExtendedReasoning ? 0.3 : 0.7,
      max_tokens: enableExtendedReasoning ? 6000 : 4096
    });

    const rawResponse = response.choices[0]?.message?.content || "Przepraszam, nie udało się wygenerować odpowiedzi.";
    
    console.log(`✅ Otrzymano odpowiedź od OpenAI (${rawResponse.length} znaków)`);

    // Parsuj odpowiedź w zależności od trybu
    if (enableExtendedReasoning) {
      const parsedResponse = parseReasoningResponse(rawResponse);
      console.log(`🧠 Proces myślowy: ${parsedResponse.reasoning ? 'ZNALEZIONY' : 'BRAK'}`);
      if (parsedResponse.reasoning) {
        console.log(`🧠 Liczba kroków: ${parsedResponse.reasoning.steps.length}`);
      }
      return parsedResponse;
    } else {
      return {
        response: improveMarkdownFormatting(rawResponse)
      };
    }

  } catch (error) {
    console.error('❌ === BŁĄD getOpenAIResponseWithExtendedReasoning ===');
    console.error('❌ Szczegóły:', error);
    
    return {
      response: "Przepraszam, wystąpił błąd podczas przetwarzania Twojego zapytania. Spróbuj ponownie później."
    };
  }
}

/**
 * Standardowy system prompt (dla trybu bez rozszerzonego myślenia)
 */
function getStandardSystemPrompt(enableWebSearch: boolean, hasDocuments: boolean): string {
  return `Jesteś pomocnym i wszechstronnym asystentem AI o nazwie MarsoftAI.

Twoje główne kompetencje:
- Specjalizujesz się w projektach UE i dokumentacji projektowej
- Potrafisz odpowiadać na szeroki zakres pytań z różnych dziedzin
- Analizujesz dokumenty i dane
- Pomagasz w programowaniu, naukach, biznesie i wielu innych obszarach

${enableWebSearch 
  ? `🌐 WYSZUKIWANIE W INTERNECIE: WŁĄCZONE`
  : `🌐 WYSZUKIWANIE W INTERNECIE: WYŁĄCZONE`}

${hasDocuments 
  ? `**WAŻNE: Masz dostęp do dokumentów referencyjnych. Bazuj na nich w pierwszej kolejności przy odpowiadaniu na pytania.**`
  : ''}

FORMATOWANIE ODPOWIEDZI (Markdown):
1. Listy punktowane: używaj myślników (-) w nowych liniach
2. Listy numerowane: 1., 2., itd. w nowych liniach  
3. Nagłówki: ## dla głównych sekcji, ### dla podsekcji
4. Pogrubienia: **tekst** dla ważnych terminów
5. Wydzielaj sekcje pustymi liniami

ZASADY:
- Odpowiadaj dokładnie i rzetelnie
- Dostosuj ton do charakteru pytania  
- Jeśli nie znasz odpowiedzi, powiedz to szczerze
- Zachowaj profesjonalizm i życzliwość`;
}

/**
 * Analiza PDF z rozszerzonym myśleniem
 */
export async function analyzePdfWithExtendedReasoning(
  pdfText: string, 
  pdfMetadata: any, 
  query: string, 
  documentIds: string[] = [],
  enableWebSearch: boolean = true,
  enableExtendedReasoning: boolean = false
): Promise<ExtendedResponse> {
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

    fullContext += `\n## Na podstawie powyższej zawartości, odpowiedz na pytanie:\n${query}`;
    
    if (enableExtendedReasoning) {
      fullContext += `\n\nPrzedstaw swój proces myślowy w formacie JSON, a następnie podaj finalną odpowiedź.`;
    }
    
    return await getOpenAIResponseWithExtendedReasoning(
      fullContext, 
      [], 
      enableWebSearch, 
      enableExtendedReasoning
    );
    
  } catch (error) {
    console.error('Błąd podczas analizy PDF z rozszerzonym myśleniem:', error);
    return {
      response: "Przepraszam, wystąpił błąd podczas analizy dokumentu. Spróbuj ponownie później."
    };
  }
}

/**
 * Analiza Excel z rozszerzonym myśleniem
 */
export async function analyzeExcelWithExtendedReasoning(
  excelText: string, 
  excelMetadata: any, 
  query: string,
  documentIds: string[] = [],
  enableWebSearch: boolean = true,
  enableExtendedReasoning: boolean = false
): Promise<ExtendedResponse> {
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

    fullContext += `\n## Na podstawie powyższej zawartości, odpowiedz na pytanie:\n${query}`;
    
    if (enableExtendedReasoning) {
      fullContext += `\n\nPrzedstaw swój proces myślowy w formacie JSON, a następnie podaj finalną odpowiedź.`;
    }
    
    return await getOpenAIResponseWithExtendedReasoning(
      fullContext, 
      [], 
      enableWebSearch, 
      enableExtendedReasoning
    );
    
  } catch (error) {
    console.error('Błąd podczas analizy Excel z rozszerzonym myśleniem:', error);
    return {
      response: "Przepraszam, wystąpił błąd podczas analizy arkusza Excel. Spróbuj ponownie później."
    };
  }
}