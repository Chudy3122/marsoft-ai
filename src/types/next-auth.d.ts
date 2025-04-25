// types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role?: string;
    name: string;
    email: string;
    image?: string | null;
  }

  interface Session extends DefaultSession {
    user?: {
      id: string;
      role?: string;
      name?: string;
      email?: string;
      image?: string;
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}