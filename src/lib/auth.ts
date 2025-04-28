// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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

        // Statyczne dane testowe
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

        // Szukamy użytkownika
        const user = users.find(u => u.email === credentials?.email);
        
        if (user && user.password === credentials?.password) {
          console.log("Autoryzacja pomyślna dla:", user.email);
          // Musimy usunąć hasło i zwrócić resztę zgodną z typem User
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
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "temporary-secret-for-development",
};