// middleware.ts
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  console.log("Middleware called for path:", request.nextUrl.pathname);
  
  // Sprawdź, czy to strona logowania
  if (request.nextUrl.pathname === '/login') {
    console.log("Login page detected");
    
    // Sprawdź token sesji
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });
    
    console.log("Token in middleware:", token ? "Exists" : "None");
    
    // Jeśli użytkownik jest zalogowany, przekieruj na stronę główną
    if (token) {
      console.log("User is logged in, redirecting to homepage");
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // W przeciwnym razie, pozwól na dostęp do strony logowania
    return NextResponse.next();
  }
  
  // Dla pozostałych chronionych stron, sprawdź sesję
  if (request.nextUrl.pathname !== '/_next' && 
      !request.nextUrl.pathname.startsWith('/api/') && 
      !request.nextUrl.pathname.startsWith('/login')) {
    
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });
    
    // Jeśli nie ma tokenu, przekieruj na stronę logowania
    if (!token) {
      console.log("No token, redirecting to login");
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

// Określ, dla których ścieżek ma być uruchamiany middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)'
  ],
};