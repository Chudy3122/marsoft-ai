// src/lib/openai-service.ts
import OpenAI from 'openai';

// Inicjalizacja klienta OpenAI z kluczem API
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Funkcja do pobierania odpowiedzi od OpenAI
 * @param prompt Zapytanie do API
 * @returns Odpowiedź od API
 */
export async function getOpenAIResponse(prompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Ekonomiczny model
      messages: [
        {
          role: "system",
          content: "Jesteś asystentem MarsoftAI, specjalistą od projektów UE. Pomagasz w tworzeniu dokumentacji projektowej, odpowiadasz na pytania związane z funduszami europejskimi, i doradzasz w kwestiach pisania wniosków, raportów, harmonogramów i budżetów. Odpowiadasz zawsze po polsku, zwięźle i rzeczowo."
        },
        {
          role: "user",
          content: prompt
        }
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
 * @returns Odpowiedź od API
 */
export async function analyzePdfWithOpenAI(pdfText: string, pdfMetadata: any, query: string): Promise<string> {
  try {
    // Przygotuj prompt z treścią PDF i zapytaniem użytkownika
    const prompt = `
Analizowany dokument PDF:
Tytuł: ${pdfMetadata.title || 'Nieznany'}
Liczba stron: ${pdfMetadata.pages || 'Nieznana'}

Zawartość dokumentu (fragment):
${pdfText.substring(0, 3000)}...

Na podstawie powyższej zawartości dokumentu, odpowiedz na pytanie: ${query}
`;

    return await getOpenAIResponse(prompt);
  } catch (error) {
    console.error('Błąd podczas analizy PDF z OpenAI:', error);
    return "Przepraszam, wystąpił błąd podczas analizy dokumentu. Spróbuj ponownie później.";
  }
}