// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Sprawdź, czy jesteśmy w środowisku produkcyjnym
const isProd = process.env.NODE_ENV === 'production';

// Deklaracja globalnej zmiennej dla PrismaClient
declare global {
  var prismaGlobal: PrismaClient | undefined;
}

// Inicjalizacja klienta Prisma
const prisma = globalThis.prismaGlobal || new PrismaClient({
  log: isProd ? ['error'] : ['query', 'error', 'warn'],
});

// W trybie deweloperskim zapisujemy instancję Prisma globalnie, aby uniknąć
// wielu połączeń podczas hot-reloadingu Next.js
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;