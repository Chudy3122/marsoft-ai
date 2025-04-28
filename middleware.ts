// middleware.ts
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Wyłącz middleware dla '/api' i innych ścieżek systemowych
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.includes('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Debugging - zapisujemy informacje o ścieżce
  console.log(`Middleware for: ${request.nextUrl.pathname}`);
  
  // Pobierz token sesji
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Zapisujemy informacje o tokenie (bez szczegółów)
  console.log(`Token exists: ${!!token}`);

  // Dla strony logowania
  if (request.nextUrl.pathname === '/login') {
    // Jeśli użytkownik jest zalogowany, przekieruj na stronę główną
    if (token) {
      console.log('User already logged in, redirecting to homepage');
      return NextResponse.redirect(new URL('/', request.url));
    }
    // W przeciwnym razie pozwól na kontynuowanie do strony logowania
    return NextResponse.next();
  }

  // Dla wszystkich innych chronionych ścieżek
  if (!token) {
    console.log('No token found, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Określamy, które ścieżki mają być objęte middleware
export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};