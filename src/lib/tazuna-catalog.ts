import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { TOURNAMENT_CATALOG_DATE } from "./constants";
import { spriteFileName } from "./sprites";
import type { CatalogSkill, CatalogUma, TazunaCatalog } from "./tazuna-types";

export type { CatalogSkill, CatalogUma, TazunaCatalog } from "./tazuna-types";

const REPO = "JustWastingTime/TazunaDiscordBot";
const CHAR_PATH = "assets/character.json";
const SKILL_PATH = "assets/skill.json";
const CACHE_VERSION = "2";
const FETCH_MS = 8_000;
const memory = new Map<string, TazunaCatalog>();

type CharRaw = {
  id?: string;
  character_name?: string;
  type?: string;
  costume?: string;
  aliases?: unknown;
  thumbnail?: string;
};

type SkillRaw = {
  skill_name?: string;
  aliases?: unknown;
  rarity?: string;
  note?: string;
};

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "bunny-invitational-2",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

function timedSignal() {
  return AbortSignal.timeout(FETCH_MS);
}

export function catalogDate(value?: string | null) {
  const raw = (value || process.env.TAZUNA_AS_OF || TOURNAMENT_CATALOG_DATE).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : TOURNAMENT_CATALOG_DATE;
}

function cacheDir(asOf: string) {
  return path.join(process.cwd(), ".cache", "tazuna", asOf);
}

function spriteIdFromRow(row: CharRaw) {
  const fromThumb = row.thumbnail?.match(/_(\d{6})\.png/i);
  if (fromThumb) return fromThumb[1];
  const id = row.id ?? "";
  const match = id.match(/^(\d{6})/);
  return match ? match[1] : id.replace(/\s.*$/, "").trim();
}

function asStringList(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function normalizeUma(row: CharRaw): CatalogUma | null {
  if (!row.character_name || !row.id) return null;
  const spriteId = spriteIdFromRow(row);
  const type = row.type || "Original";
  const local = spriteFileName(spriteId);
  return {
    id: row.id,
    spriteId,
    name: `${row.character_name} (${type})`,
    characterName: row.character_name,
    type,
    costume: row.costume ?? "",
    aliases: asStringList(row.aliases),
    thumbnail: local ?? row.thumbnail ?? "",
    fallbackThumb: row.thumbnail ?? "",
  };
}

function normalizeSkill(row: SkillRaw): CatalogSkill | null {
  if (!row.skill_name || row.note) return null;
  return {
    name: row.skill_name,
    aliases: asStringList(row.aliases),
    rarity: row.rarity ?? "",
  };
}

async function commitShaAt(filePath: string, asOf: string): Promise<string | null> {
  try {
    const url = `https://api.github.com/repos/${REPO}/commits?path=${encodeURIComponent(filePath)}&until=${asOf}T23:59:59Z&per_page=1`;
    const res = await fetch(url, { headers: githubHeaders(), cache: "no-store", signal: timedSignal() });
    if (!res.ok) return null;
    const json = (await res.json()) as { sha?: string }[];
    return json[0]?.sha ?? null;
  } catch {
    return null;
  }
}

async function fetchRawJson(filePath: string, sha: string | null) {
  const ref = sha ?? "main";
  const url = `https://raw.githubusercontent.com/${REPO}/${ref}/${filePath}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "bunny-invitational-2" },
    cache: "no-store",
    signal: timedSignal(),
  });
  if (!res.ok) throw new Error(`Could not fetch ${filePath} (${res.status})`);
  return res.json();
}

async function readCached(asOf: string): Promise<TazunaCatalog | null> {
  const dir = cacheDir(asOf);
  for (const name of [`catalog-v${CACHE_VERSION}.json`, "catalog.json"]) {
    try {
      const cached = JSON.parse(await readFile(path.join(dir, name), "utf8")) as TazunaCatalog;
      if (cached?.umas?.length && cached?.skills?.length) return cached;
    } catch {
      /* miss */
    }
  }
  return null;
}

export async function getTazunaCatalog(asOfInput?: string | null, refresh = false): Promise<TazunaCatalog> {
  const asOf = catalogDate(asOfInput);
  const key = `${asOf}:${CACHE_VERSION}`;
  if (!refresh && memory.has(key)) return memory.get(key)!;

  if (!refresh) {
    const cached = await readCached(asOf);
    if (cached) {
      memory.set(key, cached);
      return cached;
    }
  }

  let sha: string | null = null;
  try {
    const [charSha, skillSha] = await Promise.all([commitShaAt(CHAR_PATH, asOf), commitShaAt(SKILL_PATH, asOf)]);
    sha = charSha ?? skillSha;
  } catch {
    sha = null;
  }

  const [chars, skillsRaw] = await Promise.all([
    fetchRawJson(CHAR_PATH, sha) as Promise<CharRaw[]>,
    fetchRawJson(SKILL_PATH, sha) as Promise<SkillRaw[]>,
  ]);

  const catalog: TazunaCatalog = {
    asOf,
    commitSha: sha,
    umas: chars.map(normalizeUma).filter((row): row is CatalogUma => row !== null),
    skills: skillsRaw.map(normalizeSkill).filter((row): row is CatalogSkill => row !== null),
  };

  memory.set(key, catalog);
  try {
    await mkdir(cacheDir(asOf), { recursive: true });
    await writeFile(path.join(cacheDir(asOf), `catalog-v${CACHE_VERSION}.json`), JSON.stringify(catalog));
  } catch {
    /* serverless fs may be read-only */
  }
  return catalog;
}
