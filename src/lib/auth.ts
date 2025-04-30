import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Deklaracje typów
declare module "next-auth" {
  interface User {
    id: string;
    name: string | null; // Dodajemy możliwość null do name
    email: string;
    role?: string;
  }
  
  interface Session {
    user?: {
      id: string;
      role?: string;
      name?: string | null; // Dodajemy możliwość null do name
      email?: string;
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}

export const authOptions: NextAuthOptions = {
  debug: true,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Hasło", type: "password" }
      },
      async authorize(credentials) {
        console.log("Próba autoryzacji dla:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log("Brak poprawnych danych uwierzytelniających");
          return null;
        }

        try {
          // Pobieranie użytkownika z bazy danych
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user) {
            console.log("Użytkownik nie znaleziony w bazie danych");
            return null;
          }

          // Sprawdzenie hasła (jako plaintext)
          if (user.password === credentials.password) {
            console.log("Autoryzacja pomyślna dla:", user.email);
            
            // Konwertujemy użytkownika z bazy danych na format wymagany przez NextAuth
            const authUser = {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              // Pomijamy tu password i inne pola, które nie są częścią interfejsu User
            };
            
            return authUser;
          } else {
            console.log("Niepoprawne hasło");
            return null;
          }
        } catch (error) {
          console.error("Błąd podczas autoryzacji:", error);
          return null;
        } finally {
          // Zalecane zamykanie połączenia Prisma w kontekście serverless
          await prisma.$disconnect();
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    // Dodajemy callback dla kontroli przekierowań
    async redirect({ url, baseUrl }) {
      console.log("NextAuth redirect callback:", { url, baseUrl });
      
      // Zapobiegamy nieskończonym pętlom przekierowań
      if (url.startsWith('/login') && url.includes('callbackUrl=/login')) {
        return baseUrl;
      }
      
      // Standardowa obsługa przekierowań
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      } else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dni
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  // Używamy zmiennej środowiskowej lub fallback dla testów
  secret: process.env.NEXTAUTH_SECRET || "temporary-secret-for-development",
};