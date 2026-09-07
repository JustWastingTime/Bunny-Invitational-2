import { PrismaClient } from "@prisma/client";
import path from "node:path";

function databaseUrl() {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (raw === "file:./dev.db" || raw === "file:dev.db") {
    return `file:${path.join(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/")}`;
  }
  if (/^postgres(ql)?:/i.test(raw)) {
    const parts: string[] = [];
    if (!/[?&]connection_limit=/i.test(raw)) parts.push("connection_limit=1");
    if (!/[?&]pgbouncer=/i.test(raw) && /-pooler\./i.test(raw)) parts.push("pgbouncer=true");
    if (!parts.length) return raw;
    return `${raw}${raw.includes("?") ? "&" : "?"}${parts.join("&")}`;
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
