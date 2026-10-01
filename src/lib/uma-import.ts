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

export function importUmaJson(
  raw: string,
  umas: CatalogUma[],
  skills: CatalogSkill[],
): { patch: ImportedUma; warnings: string[] } {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const warnings: string[] = [];

  const outfitId = text(parsed.outfitId ?? parsed.outfit_id ?? parsed.spriteId);
  const uma = umas.find((row) => row.spriteId === outfitId);
  if (!outfitId) warnings.push("No outfit id.");
  else if (!uma) warnings.push(`Outfit ${outfitId} is not in the Tazuna list. Art still uses that id.`);

  const styleKey = text(parsed.strategy ?? parsed.style).toLowerCase();
  const style = STYLES[styleKey];
  if (styleKey && !style) warnings.push(`Unknown strategy “${styleKey}”.`);

  const skillIds = [
    ...idList(parsed.skills),
    ...idList(parsed.other),
  ];
  const byId = new Map<string, CatalogSkill>();
  for (const skill of skills) {
    if (skill.id) byId.set(skill.id, skill);
  }
  const names: string[] = [];
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
    names.push(name);
  }
  if (missing.length) warnings.push(`Unknown skills: ${missing.join(", ")}.`);

  return {
    patch: {
      ...(uma ? { umaName: uma.name } : {}),
      ...(outfitId ? { spriteId: uma?.spriteId ?? outfitId, spritePath: uma?.thumbnail || spriteFileName(outfitId) } : {}),
      ...(style ? { style, styleLabel: STYLE_LABEL[style] ?? style } : {}),
      aptitudes: {
        terrain: grade(parsed.surfaceAptitude ?? parsed.surface_aptitude),
        distance: grade(parsed.distanceAptitude ?? parsed.distance_aptitude),
        style: grade(parsed.strategyAptitude ?? parsed.strategy_aptitude),
      },
      stats: {
        speed: stat(parsed.speed),
        stamina: stat(parsed.stamina),
        power: stat(parsed.power),
        guts: stat(parsed.guts),
        wisdom: stat(parsed.wisdom ?? parsed.wit),
      },
      skills: names,
    },
    warnings,
  };
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

function idList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(idList);
  if (value && typeof value === "object") return Object.values(value).flatMap(idList);
  const id = text(value).replace(/\D/g, "");
  return id ? [id] : [];
}
