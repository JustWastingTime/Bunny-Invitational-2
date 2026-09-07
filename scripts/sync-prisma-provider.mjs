import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "prisma", "schema.prisma");
const outPath = join(root, "prisma", "schema.build.prisma");
const url = process.env.DATABASE_URL ?? "";
const onVercel = Boolean(process.env.VERCEL);
const postgres = /^(postgres(ql)?:)/i.test(url);

if (onVercel && !postgres) {
  console.error(
    "Vercel deploys need a Postgres DATABASE_URL (Neon, Supabase, etc.). SQLite only works locally.",
  );
  process.exit(1);
}

const provider = postgres ? "postgresql" : "sqlite";
const source = readFileSync(sourcePath, "utf8");
const built = source.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${provider}"`);
writeFileSync(outPath, built);
console.log(`Prisma provider: ${provider}`);
