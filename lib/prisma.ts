/**
 * prisma.ts — Prisma Client Singleton
 *
 * Next.js hot-reload creates new module instances in development.
 * Without this singleton pattern, each reload instantiates a new
 * PrismaClient, quickly exhausting the SQLite connection pool.
 *
 * The global cache prevents that by reusing a single client instance
 * across all hot-reloads, while production always creates one fresh instance.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
