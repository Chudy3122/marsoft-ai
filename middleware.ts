// middleware.ts 
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Pomiń middleware dla statycznych zasobów (kluczowe dla poprawnego ładowania JS)
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('.js') ||
    request.nextUrl.pathname.includes('.css') ||
    request.nextUrl.pathname.includes('.woff') ||
    request.nextUrl.pathname.includes('.woff2') ||
    request.nextUrl.pathname.includes('.svg') ||
    request.nextUrl.pathname.includes('.png') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.includes('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Pobierz token sesji
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Dla strony logowania
  if (request.nextUrl.pathname === '/login') {
    // Jeśli użytkownik jest zalogowany, przekieruj na stronę główną
    if (token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Dla pozostałych chronionych ścieżek
  if (!token && !request.nextUrl.pathname.startsWith('/api/')) {
    console.log('Przekierowanie do /login z:', request.nextUrl.pathname);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};