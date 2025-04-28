// src/app/api/openai/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Inicjalizacja klienta OpenAI
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Pobierz parametry z zapytania
    const { documentContent, metadata, prompt, type } = await request.json();

    if (!documentContent || !prompt) {
      return NextResponse.json(
        { error: 'Brak wymaganych parametrów' },
        { status: 400 }
      );
    }

    // Przygotuj zapytanie z odpowiednim kontekstem w zależności od typu dokumentu
    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'pdf':
        systemPrompt = `Jesteś asystentem MarsoftAI, specjalistą od projektów UE, który analizuje dokumenty PDF. 
          Odpowiadasz na pytania dotyczące zawartości dokumentów w sposób precyzyjny i pomocny. 
          Pomagasz w tworzeniu dokumentacji projektowej i odpowiadasz zawsze po polsku, zwięźle i rzeczowo.`;
        
        userPrompt = `Dokument PDF: "${metadata.title}" (${metadata.pages} stron)

Zawartość dokumentu:
${documentContent.substring(0, 15000)}  // Ograniczenie długości tekstu

Metadata dokumentu:
${JSON.stringify(metadata, null, 2)}

Pytanie użytkownika: ${prompt}

Na podstawie powyższej zawartości dokumentu, odpowiedz na pytanie.`;
        break;

      case 'excel':
        systemPrompt = `Jesteś asystentem MarsoftAI, specjalistą od projektów UE, który analizuje arkusze kalkulacyjne Excel. 
          Odpowiadasz na pytania dotyczące danych w arkuszach w sposób precyzyjny i pomocny.
          Znasz dobrze strukturę danych w arkuszach Excel, w tym koncepcje wierszy, kolumn, formuł i arkuszy.
          Odpowiadasz zawsze po polsku, zwięźle i rzeczowo.`;
        
        userPrompt = `Arkusz kalkulacyjny: "${metadata.title}" 
          (${metadata.sheetCount} arkuszy, ${metadata.totalRows} wierszy, ${metadata.totalColumns} kolumn)

Zawartość arkusza:
${documentContent.substring(0, 15000)}  // Ograniczenie długości tekstu

Metadata arkusza:
${JSON.stringify(metadata, null, 2)}

Pytanie użytkownika: ${prompt}

Na podstawie powyższej zawartości arkusza kalkulacyjnego, odpowiedz na pytanie.`;
        break;

      default:
        systemPrompt = `Jesteś asystentem MarsoftAI, specjalistą od projektów UE, który analizuje dokumenty. 
          Odpowiadasz na pytania dotyczące zawartości dokumentów w sposób precyzyjny i pomocny.
          Odpowiadasz zawsze po polsku, zwięźle i rzeczowo.`;
        
        userPrompt = `Dokument: "${metadata.title}"

Zawartość dokumentu:
${documentContent.substring(0, 15000)}  // Ograniczenie długości tekstu

Metadata dokumentu:
${JSON.stringify(metadata, null, 2)}

Pytanie użytkownika: ${prompt}

Na podstawie powyższej zawartości dokumentu, odpowiedz na pytanie.`;
    }

    // Wywołanie API OpenAI z nową składnią
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Można użyć bardziej zaawansowanego modelu, jeśli potrzeba
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    // Zwróć odpowiedź
    const aiResponse = response.choices[0]?.message?.content || 
                       'Przepraszam, nie udało się uzyskać odpowiedzi. Spróbuj ponownie.';

    return NextResponse.json({ response: aiResponse });

  } catch (error) {
    console.error('Error analyzing document with OpenAI:', error);
    return NextResponse.json(
      { error: 'Wystąpił problem podczas analizy dokumentu' },
      { status: 500 }
    );
  }
}