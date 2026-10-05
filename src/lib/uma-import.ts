import { STYLE_LABEL, type RunStyle } from "./constants";
import { plainSkillName } from "./skill-name";
import { spriteFileName } from "./sprites";
import type { CatalogSkill, CatalogUma } from "./tazuna-types";

export type ImportedUma = {
  umaName?: string;
  spriteId?: string;
  spritePath?: string | null;
  style?: RunStyle;
  styleLabel?: string;
  aptitudes: { terrain: string; distance: string; style: string };
  stats: { speed: number; stamina: number; power: number; guts: number; wisdom: number };
  skills: string[];
};

const STYLES: Record<string, RunStyle> = {
  nige: "front",
  "逃げ": "front",
  front: "front",
  "front runner": "front",
  senkou: "pace",
  senko: "pace",
  "先行": "pace",
  pace: "pace",
  "pace chaser": "pace",
  sashi: "late",
  sasu: "late",
  "差し": "late",
  late: "late",
  "late surger": "late",
  oikomi: "end",
  ooi: "end",
  oikake: "end",
  "追い込み": "end",
  "追込": "end",
  end: "end",
  "end closer": "end",
};

const RANK = ["", "G", "F", "E", "D", "C", "B", "A", "S"];

const DISTANCE_FIELD: Record<string, string> = {
  sprint: "proper_distance_short",
  mile: "proper_distance_mile",
  medium: "proper_distance_middle",
  long: "proper_distance_long",
  dirt: "proper_distance_mile",
};

const STYLE_FIELD: Record<string, string> = {
  front: "proper_running_style_nige",
  pace: "proper_running_style_senko",
  late: "proper_running_style_sashi",
  end: "proper_running_style_oikomi",
};

export function importUmaJson(
  raw: string,
  umas: CatalogUma[],
  skills: CatalogSkill[],
  context?: { category?: string | null; style?: string | null },
): { patch: ImportedUma; warnings: string[] } {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const warnings: string[] = [];

  const outfitId = text(parsed.outfitId ?? parsed.outfit_id ?? parsed.card_id ?? parsed.cardId ?? parsed.spriteId);
  const uma = umas.find((row) => row.spriteId === outfitId);
  if (!outfitId) warnings.push("No outfit id.");
  else if (!uma) warnings.push(`Outfit ${outfitId} is not in the Tazuna list. Art still uses that id.`);

  const styleKey = text(parsed.strategy ?? parsed.style).toLowerCase();
  const style = STYLES[styleKey];
  if (styleKey && !style) warnings.push(`Unknown strategy “${styleKey}”.`);

  const skillIds = [
    ...idList(parsed.skills),
    ...idList(parsed.other),
    ...skillArrayIds(parsed.skill_array ?? parsed.skillArray),
  ];
  const byId = new Map<string, CatalogSkill>();
  for (const skill of skills) {
    if (skill.id) byId.set(skill.id, skill);
  }
  const ordered: CatalogSkill[] = [];
  const seen = new Set<string>();
  const missing: string[] = [];
  for (const id of skillIds) {
    const skill = resolveSkill(id, byId);
    if (!skill) {
      missing.push(id);
      continue;
    }
    const name = plainSkillName(skill.name);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    ordered.push(skill);
  }
  // The character card shows that outfit's unique first, then the rest by skill id.
  ordered.sort((a, b) => {
    const [tierA, idA] = skillOrder(a, outfitId);
    const [tierB, idB] = skillOrder(b, outfitId);
    return tierA - tierB || idA - idB;
  });
  const names = ordered.map((skill) => plainSkillName(skill.name));
  if (missing.length) warnings.push(`Unknown skills: ${missing.join(", ")}.`);

  return {
    patch: {
      ...(uma ? { umaName: uma.name } : {}),
      ...(outfitId ? { spriteId: uma?.spriteId ?? outfitId, spritePath: uma?.thumbnail || spriteFileName(outfitId) } : {}),
      ...(style ? { style, styleLabel: STYLE_LABEL[style] ?? style } : {}),
      aptitudes: aptitudesFrom(parsed, context),
      stats: {
        speed: stat(parsed.speed),
        stamina: stat(parsed.stamina),
        power: stat(parsed.power),
        guts: stat(parsed.guts),
        wisdom: stat(parsed.wisdom ?? parsed.wit ?? parsed.wiz),
      },
      skills: names,
    },
    warnings,
  };
}

function skillOrder(skill: CatalogSkill, outfitId: string): [number, number] {
  const id = Number(skill.id);
  const ownUnique = skill.rarity === "unique" && Boolean(outfitId) && skill.cards?.includes(outfitId);
  return [ownUnique ? 0 : 1, Number.isFinite(id) ? id : Number.MAX_SAFE_INTEGER];
}

function resolveSkill(id: string, byId: Map<string, CatalogSkill>) {
  for (const candidate of skillIdCandidates(id)) {
    const skill = byId.get(candidate);
    if (skill) return skill;
  }
  return undefined;
}

function skillIdCandidates(id: string) {
  const ids = [id];
  if (id.startsWith("9")) ids.push(`1${id.slice(1)}`);
  for (const candidate of [...ids]) {
    if (candidate.endsWith("1")) ids.push(`${candidate.slice(0, -1)}2`);
  }
  return ids;
}

function text(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function stat(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function grade(value: unknown) {
  const grade = text(value).toUpperCase();
  return /^[GFEABSD]$/.test(grade) ? grade : grade.slice(0, 2);
}

function skillArrayIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (row && typeof row === "object" && "skill_id" in row) {
      const id = text((row as { skill_id?: unknown }).skill_id).replace(/\D/g, "");
      return id ? [id] : [];
    }
    return idList(row);
  });
}

function aptitudesFrom(parsed: Record<string, unknown>, context?: { category?: string | null; style?: string | null }) {
  const ranked = parsed.proper_distance_short != null || parsed.proper_ground_turf != null || parsed.proper_running_style_nige != null;
  if (!ranked) {
    return {
      terrain: grade(parsed.surfaceAptitude ?? parsed.surface_aptitude),
      distance: grade(parsed.distanceAptitude ?? parsed.distance_aptitude),
      style: grade(parsed.strategyAptitude ?? parsed.strategy_aptitude),
    };
  }
  const category = context?.category ?? "";
  const style = context?.style ?? "";
  const distanceField = DISTANCE_FIELD[category];
  const styleField = STYLE_FIELD[style];
  const terrainField = category === "dirt" ? "proper_ground_dirt" : "proper_ground_turf";
  return {
    terrain: rankGrade(parsed[terrainField]),
    distance: rankGrade(distanceField ? parsed[distanceField] : undefined),
    style: rankGrade(styleField ? parsed[styleField] : undefined),
  };
}

function rankGrade(value: unknown) {
  const letter = grade(value);
  if (/^[GFEABSD]$/.test(letter)) return letter;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? RANK[n] : "";
}

function idList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(idList);
  if (value && typeof value === "object") return Object.values(value).flatMap(idList);
  const id = text(value).replace(/\D/g, "");
  return id ? [id] : [];
}
