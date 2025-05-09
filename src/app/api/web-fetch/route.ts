import { NextResponse } from 'next/server';
import axios from 'axios';
import { JSDOM } from 'jsdom';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'Brak URL' }, { status: 400 });
    }

    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    // Usuwanie zbędnych tagów z typowaniem
    document.querySelectorAll('script, style, head, noscript').forEach((el: Element) => el.remove());

    const textContent = document.body.textContent?.replace(/\s+/g, ' ').trim() || 'Brak treści';
    const snippet = textContent.substring(0, 3000);

    return NextResponse.json({
      title: document.title || "Bez tytułu",
      url: url,
      snippet: snippet
    });

  } catch (error) {
    console.error('Błąd pobierania strony:', error);
    return NextResponse.json({ error: 'Błąd pobierania strony' }, { status: 500 });
  }
}
