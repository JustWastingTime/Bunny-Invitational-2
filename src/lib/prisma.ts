import { PrismaClient } from "@prisma/client";
import path from "node:path";

function databaseUrl() {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (raw === "file:./dev.db" || raw === "file:dev.db") {
    return `file:${path.join(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/")}`;
  }
  return raw;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
