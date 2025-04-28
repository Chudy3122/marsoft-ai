import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Deklaracje typów
declare module "next-auth" {
  interface User {
    id: string;
    role?: string;
  }
  
  interface Session {
    user?: {
      id: string;
      role?: string;
      name?: string;
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

        const users = [
          {
            id: "1",
            name: "Admin",
            email: "admin@marsoft.pl",
            password: "admin123",
            role: "admin"
          },
          {
            id: "2",
            name: "User",
            email: "user@marsoft.pl",
            password: "test123",
            role: "user"
          }
        ];

        const user = users.find(u => u.email === credentials?.email);
        
        if (user && user.password === credentials?.password) {
          console.log("Autoryzacja pomyślna dla:", user.email);
          const { password, ...userWithoutPass } = user;
          return userWithoutPass;
        }

        console.log("Autoryzacja nieudana");
        return null;
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
  // Dodaj to do authOptions w src/lib/auth.ts
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