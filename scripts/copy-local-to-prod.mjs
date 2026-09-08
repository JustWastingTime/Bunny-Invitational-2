import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlitePath = path.join(root, "prisma", "dev.db");

const prodUrl = (process.env.PROD_DATABASE_URL || process.env.DATABASE_URL || "").trim();
if (!/^postgres(ql)?:/i.test(prodUrl)) {
  console.error(
    "Set PROD_DATABASE_URL to your Neon Postgres URL (the same DATABASE_URL as Vercel).\nLeave local .env on SQLite; do not overwrite DATABASE_URL in .env.",
  );
  process.exit(1);
}

const db = new DatabaseSync(sqlitePath);
const tables = ["Team", "UmaEntry", "Match", "MatchTeam", "Race", "Placement", "OverlayState"];
const dump = {};
for (const table of tables) {
  dump[table] = db.prepare(`SELECT * FROM "${table}"`).all();
  console.log(`local ${table}: ${dump[table].length}`);
}
db.close();

const env = { ...process.env, DATABASE_URL: prodUrl };
const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { cwd: root, env, stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run("node", ["scripts/sync-prisma-provider.mjs"]);
const schemaPath = path.join(root, "prisma", "schema.build.prisma");
const copyClient = "../node_modules/.prisma-copy-client";
writeFileSync(
  schemaPath,
  readFileSync(schemaPath, "utf8").replace(
    /generator client \{[\s\S]*?\n\}/,
    `generator client {\n  provider = "prisma-client-js"\n  output   = "${copyClient}"\n}`,
  ),
);
run("npx", ["prisma", "generate", "--schema", "prisma/schema.build.prisma"]);
run("npx", ["prisma", "db", "push", "--schema", "prisma/schema.build.prisma"]);

const require = createRequire(import.meta.url);
const { PrismaClient } = require(path.join(root, "node_modules", ".prisma-copy-client"));
const dest = new PrismaClient({ datasources: { db: { url: prodUrl } } });

const asBool = (value) => value === true || value === 1 || value === "1";

await dest.$transaction(async (tx) => {
  await tx.placement.deleteMany();
  await tx.race.deleteMany();
  await tx.matchTeam.deleteMany();
  await tx.umaEntry.deleteMany();
  await tx.match.deleteMany();
  await tx.team.deleteMany();
  await tx.overlayState.deleteMany();

  if (dump.Team.length) await tx.team.createMany({ data: dump.Team });
  if (dump.Match.length) await tx.match.createMany({ data: dump.Match });
  if (dump.OverlayState.length) {
    await tx.overlayState.createMany({
      data: dump.OverlayState.map((row) => ({ ...row, visible: asBool(row.visible) })),
    });
  }
  if (dump.UmaEntry.length) await tx.umaEntry.createMany({ data: dump.UmaEntry });
  if (dump.MatchTeam.length) await tx.matchTeam.createMany({ data: dump.MatchTeam });
  if (dump.Race.length) await tx.race.createMany({ data: dump.Race });
  if (dump.Placement.length) await tx.placement.createMany({ data: dump.Placement });
});

await dest.$disconnect();

const localEnv = { ...process.env, DATABASE_URL: "file:./dev.db" };
const restore = spawnSync("node", ["scripts/sync-prisma-provider.mjs"], {
  cwd: root,
  env: localEnv,
  stdio: "inherit",
  shell: true,
});
if (restore.status !== 0) process.exit(restore.status ?? 1);

console.log("Production now matches local prisma/dev.db.");
