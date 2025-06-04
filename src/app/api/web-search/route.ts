// app/api/web-search/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Brak zapytania wyszukiwania' },
        { status: 400 }
      );
    }

    // Opcja 1: Użyj Brave Search API (zalecane)
    if (process.env.BRAVE_SEARCH_API_KEY) {
      const braveResponse = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&country=PL&lang=pl`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY,
          },
        }
      );

      if (!braveResponse.ok) {
        throw new Error(`Brave Search API error: ${braveResponse.status}`);
      }

      const braveData = await braveResponse.json();
      
      const results = braveData.web?.results?.slice(0, 5).map((result: any) => ({
        title: result.title,
        url: result.url,
        snippet: result.description,
        published: result.age || null
      })) || [];

      return NextResponse.json({
        query,
        results,
        totalResults: results.length,
        source: 'brave'
      });
    }

    // Opcja 2: Użyj SerpAPI (alternatywa)
    if (process.env.SERPAPI_KEY) {
      const serpResponse = await fetch(
        `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=pl&gl=pl&num=5&api_key=${process.env.SERPAPI_KEY}`
      );

      if (!serpResponse.ok) {
        throw new Error(`SerpAPI error: ${serpResponse.status}`);
      }

      const serpData = await serpResponse.json();
      
      const results = serpData.organic_results?.slice(0, 5).map((result: any) => ({
        title: result.title,
        url: result.link,
        snippet: result.snippet,
        published: result.date || null
      })) || [];

      return NextResponse.json({
        query,
        results,
        totalResults: results.length,
        source: 'serpapi'
      });
    }

    // Opcja 3: Użyj DuckDuckGo (darmowe, ale mniej niezawodne)
    const duckResponse = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&lang-region=pl-pl`
    );

    if (!duckResponse.ok) {
      throw new Error(`DuckDuckGo API error: ${duckResponse.status}`);
    }

    const duckData = await duckResponse.json();
    
    const results = duckData.RelatedTopics?.slice(0, 5).map((result: any) => ({
      title: result.Text?.split(' - ')[0] || 'Brak tytułu',
      url: result.FirstURL,
      snippet: result.Text,
      published: null
    })).filter((result: any) => result.url) || [];

    return NextResponse.json({
      query,
      results,
      totalResults: results.length,
      source: 'duckduckgo'
    });

  } catch (error) {
    console.error('Błąd wyszukiwania:', error);
    return NextResponse.json(
      { 
        error: 'Błąd podczas wyszukiwania w internecie',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  }
}