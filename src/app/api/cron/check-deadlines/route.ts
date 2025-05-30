// src/app/api/cron/check-deadlines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkUpcomingDeadlines } from '@/lib/notifications';

// Klucz API do ochrony endpointu (powinien być przechowywany w zmiennych środowiskowych)
const API_KEY = process.env.CRON_API_KEY;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  // Sprawdź autoryzację
  if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await checkUpcomingDeadlines();
    return NextResponse.json({ success: true, message: 'Sprawdzanie deadlineów zakończone powodzeniem' });
  } catch (error) {
    console.error('Błąd podczas sprawdzania nadchodzących terminów:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas sprawdzania terminów', details: (error as Error).message }, 
      { status: 500 }
    );
  }
}