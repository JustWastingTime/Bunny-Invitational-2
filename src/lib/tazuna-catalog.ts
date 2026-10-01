import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spriteFileName, spriteLocalPath } from "./sprites";
import type { CatalogSkill, CatalogUma, TazunaCatalog } from "./tazuna-types";

export type { CatalogSkill, CatalogUma, TazunaCatalog } from "./tazuna-types";

const REPO = "JustWastingTime/TazunaDiscordBot";
const CHAR_PATH = "assets/character.json";
const SKILL_PATH = "assets/skill.json";
const CACHE_VERSION = "5";
const FETCH_MS = 20_000;
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

function cacheFile() {
  return path.join(process.cwd(), ".cache", "tazuna", "latest", `catalog-v${CACHE_VERSION}.json`);
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
  return {
    id: row.id,
    spriteId,
    name: `${row.character_name} (${type})`,
    characterName: row.character_name,
    type,
    costume: row.costume ?? "",
    aliases: asStringList(row.aliases),
    thumbnail: row.thumbnail || spriteFileName(spriteId) || "",
    fallbackThumb: spriteLocalPath(spriteId) ?? "",
  };
}

function normalizeSkill(row: SkillRaw): CatalogSkill | null {
  // `note` is a section banner Tazuna attaches to the first skill in a group
  // (Right-Handed, Professor of Curvature, and the rest of those lead-ins).
  if (!row.skill_name) return null;
  return {
    name: row.skill_name,
    aliases: asStringList(row.aliases),
    rarity: row.rarity ?? "",
  };
}

async function latestCommitSha(): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/commits/main`, {
      headers: githubHeaders(),
      cache: "no-store",
      signal: timedSignal(),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { sha?: string };
    return json.sha ?? null;
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

async function readCached(): Promise<TazunaCatalog | null> {
  try {
    const cached = JSON.parse(await readFile(cacheFile(), "utf8")) as TazunaCatalog;
    if (cached?.umas?.length && cached?.skills?.length) return cached;
  } catch {
    /* miss */
  }
  return null;
}

/** Latest Tazuna character and skill lists from the main branch, cached on disk. */
export async function getTazunaCatalog(refresh = false): Promise<TazunaCatalog> {
  const key = `latest:${CACHE_VERSION}`;
  if (!refresh && memory.has(key)) return memory.get(key)!;

  if (!refresh) {
    const cached = await readCached();
    if (cached) {
      memory.set(key, cached);
      return cached;
    }
  }

  const sha = await latestCommitSha();
  const [chars, skillsRaw] = await Promise.all([
    fetchRawJson(CHAR_PATH, sha) as Promise<CharRaw[]>,
    fetchRawJson(SKILL_PATH, sha) as Promise<SkillRaw[]>,
  ]);

  const catalog: TazunaCatalog = {
    asOf: new Date().toISOString().slice(0, 10),
    commitSha: sha,
    umas: chars.map(normalizeUma).filter((row): row is CatalogUma => row !== null),
    skills: skillsRaw.map(normalizeSkill).filter((row): row is CatalogSkill => row !== null),
  };

  memory.set(key, catalog);
  try {
    await mkdir(path.dirname(cacheFile()), { recursive: true });
    await writeFile(cacheFile(), JSON.stringify(catalog));
  } catch {
    /* serverless fs may be read-only */
  }
  return catalog;
}
