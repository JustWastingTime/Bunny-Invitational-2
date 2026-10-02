import {
  CATEGORIES,
  CATEGORY_LABEL,
  GROUPS,
  PAIR_BONUS,
  PLACE_POINTS,
  PLAY_IN_STAGE,
  POPULAR_PENALTY_FIRST,
  POPULAR_PENALTY_SECOND_THIRD,
  RACE_MAPS,
  TEAM_KIND_MAIN,
  TEAM_KIND_PLAYIN,
  UNIQUE_BONUS,
  type Category,
} from "./constants";
import { popularityFromRosters } from "./scoring";
import type { PublicTeam } from "./types";

export type BriefPool = "playin" | "main";

export type BriefStats = {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
};

export type BriefRunner = {
  team: string;
  short: string;
  color: string;
  trainer: string;
  distance: string;
  stats: BriefStats;
};

export type BriefUma = {
  spriteId: string;
  name: string;
  spritePath: string | null;
  count: number;
  oshi: number;
  penalty: number;
  runners: BriefRunner[];
};

export type BriefClub = {
  id: string;
  name: string;
  short: string;
  color: string;
};

export type BriefGroup = {
  id: string;
  label: string;
  teams: BriefClub[];
};

export type BriefSlide =
  | { id: string; kind: "soon" }
  | { id: string; kind: "title"; pool: BriefPool; groups: BriefGroup[] }
  | { id: string; kind: "maps" }
  | { id: string; kind: "map"; category: Category }
  | { id: string; kind: "places" }
  | { id: string; kind: "oshi"; uniqueCount: number; pairCount: number }
  | { id: string; kind: "penalty"; penalized: number }
  | { id: string; kind: "costume"; uma: BriefUma }
  | { id: string; kind: "costumes"; tone: "penalty" | "pair" | "unique"; title: string; umas: BriefUma[]; page: number; pages: number };

const PENALTY_PER_SLIDE = 4;
const PAIR_PER_SLIDE = 4;
const UNIQUE_PER_SLIDE = 8;

export function briefingPool(stage: string | null | undefined): BriefPool {
  return stage === PLAY_IN_STAGE ? "playin" : "main";
}

export function briefSlideGroup(slide: BriefSlide) {
  switch (slide.kind) {
    case "soon":
      return "Welcome";
    case "title":
      return "Welcome";
    case "maps":
    case "map":
      return "Maps";
    case "places":
    case "oshi":
    case "penalty":
      return "Points";
    case "costume":
      return "Penalized";
    case "costumes":
      return slide.tone === "pair" ? "Oshi +1" : slide.tone === "unique" ? "Oshi +2" : "Penalized";
  }
}

export function briefSlideLabel(slide: BriefSlide) {
  switch (slide.kind) {
    case "soon":
      return "Starting soon";
    case "title":
      return slide.pool === "playin" ? "Play-in welcome" : "Main field welcome";
    case "maps":
      return "The maps";
    case "map": {
      const map = RACE_MAPS.find((row) => row.category === slide.category);
      return `${CATEGORY_LABEL[slide.category]} · ${map?.venue ?? slide.category}`;
    }
    case "places":
      return "Place points";
    case "oshi":
      return "Oshi buff";
    case "penalty":
      return "Meta penalty";
    case "costume":
      return `${signed(slide.uma.penalty)} · ${slide.uma.name} · ${slide.uma.count}`;
    case "costumes": {
      const page = slide.pages > 1 ? ` (${slide.page + 1}/${slide.pages})` : "";
      if (slide.tone === "penalty") {
        const [first, ...rest] = slide.umas;
        const head = first ? `${signed(first.penalty)} · ${first.name}` : slide.title;
        return `${head}${rest.length ? ` +${rest.length}` : ""}${page}`;
      }
      return `${slide.title}${page}`;
    }
  }
}

export function buildBriefingSlides(teams: PublicTeam[], pool: BriefPool): BriefSlide[] {
  const umas = costumesInPool(teams, pool);
  const unique = umas.filter((uma) => uma.count === 1);
  const pairs = umas.filter((uma) => uma.count === 2 && uma.penalty === 0).sort(byName);
  const penalized = umas
    .filter((uma) => uma.penalty !== 0)
    .sort((a, b) => a.penalty - b.penalty || b.count - a.count || a.name.localeCompare(b.name));
  const slides: BriefSlide[] = [
    { id: "soon", kind: "soon" },
    { id: "title", kind: "title", pool, groups: welcomeGroups(teams, pool) },
    { id: "maps", kind: "maps" },
    ...RACE_MAPS.filter((map) => CATEGORIES.includes(map.category)).map((map) => ({
      id: `map-${map.category}`,
      kind: "map" as const,
      category: map.category,
    })),
    { id: "places", kind: "places" },
    { id: "oshi", kind: "oshi", uniqueCount: unique.length, pairCount: pairs.length },
    { id: "penalty", kind: "penalty", penalized: penalized.length },
  ];

  const heroes = penalized.filter((uma) => uma.penalty === POPULAR_PENALTY_FIRST);
  const rest = penalized.filter((uma) => uma.penalty !== POPULAR_PENALTY_FIRST);
  if (heroes.length <= 3) {
    for (const uma of heroes) slides.push({ id: `pen-${uma.spriteId}`, kind: "costume", uma });
  } else {
    pushCostumePages(slides, heroes, "penalty", "Meta penalty");
  }
  pushCostumePages(slides, rest, "penalty", "Meta penalty");

  pushCostumePages(slides, pairs, "pair", "Oshi +1");
  pushCostumePages(slides, unique.sort(byName), "unique", "Oshi +2");

  return slides;
}

function pushCostumePages(slides: BriefSlide[], umas: BriefUma[], tone: "penalty" | "pair" | "unique", title: string) {
  const size = tone === "unique" ? UNIQUE_PER_SLIDE : tone === "pair" ? PAIR_PER_SLIDE : PENALTY_PER_SLIDE;
  chunk(umas, size).forEach((pageUmas, page, all) => {
    slides.push({
      id: `${tone}-${page}-${pageUmas[0]?.spriteId ?? page}`,
      kind: "costumes",
      tone,
      title,
      umas: pageUmas,
      page,
      pages: all.length,
    });
  });
}

export function signed(n: number) {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return "0";
}

export const BRIEF_POINTS = {
  place: PLACE_POINTS,
  unique: UNIQUE_BONUS,
  pair: PAIR_BONUS,
  first: POPULAR_PENALTY_FIRST,
  second: POPULAR_PENALTY_SECOND_THIRD,
};

function welcomeGroups(teams: PublicTeam[], pool: BriefPool): BriefGroup[] {
  const kind = pool === "playin" ? TEAM_KIND_PLAYIN : TEAM_KIND_MAIN;
  const clubs = teams.filter((team) => team.kind === kind).sort(bySlot);
  const club = (team: PublicTeam): BriefClub => ({
    id: team.id,
    name: team.name,
    short: team.shortName || team.name,
    color: team.color || "#ffd56a",
  });
  if (pool === "playin") return [{ id: "playin", label: "Play-in", teams: clubs.map(club) }];
  return GROUPS.map((group) => ({
    id: group,
    label: `Group ${group}`,
    teams: clubs.filter((team) => team.group === group).map(club),
  }));
}

function bySlot(a: PublicTeam, b: PublicTeam) {
  return (a.groupSlot ?? 99) - (b.groupSlot ?? 99) || a.name.localeCompare(b.name);
}

function costumesInPool(teams: PublicTeam[], pool: BriefPool): BriefUma[] {
  const kind = pool === "playin" ? TEAM_KIND_PLAYIN : TEAM_KIND_MAIN;
  const drafts = new Map<string, { spritePath: string | null; names: Map<string, number>; runners: BriefRunner[] }>();
  const entries: { spriteId: string }[] = [];

  for (const team of teams) {
    if (team.kind !== kind) continue;
    for (const uma of team.roster) {
      const spriteId = uma.spriteId.trim();
      if (!spriteId) continue;
      entries.push({ spriteId });
      const draft = drafts.get(spriteId) ?? { spritePath: null, names: new Map<string, number>(), runners: [] };
      if (!draft.spritePath && uma.spritePath) draft.spritePath = uma.spritePath;
      const name = uma.umaName.trim();
      if (name) draft.names.set(name, (draft.names.get(name) ?? 0) + 1);
      const category = uma.category as Category;
      draft.runners.push({
        team: team.name,
        short: team.shortName || team.name,
        color: team.color || "#ffd56a",
        trainer: uma.trainer.trim() || "—",
        distance: CATEGORY_LABEL[category] ?? uma.category,
        stats: uma.stats,
      });
      drafts.set(spriteId, draft);
    }
  }

  const pop = popularityFromRosters(entries);
  const umas: BriefUma[] = [];
  for (const [spriteId, draft] of drafts) {
    const info = pop.get(spriteId);
    const count = info?.count ?? draft.runners.length;
    draft.runners.sort((a, b) => a.distance.localeCompare(b.distance) || a.team.localeCompare(b.team) || a.trainer.localeCompare(b.trainer));
    umas.push({
      spriteId,
      name: popularName(draft.names),
      spritePath: draft.spritePath,
      count,
      oshi: count === 1 ? UNIQUE_BONUS : count === 2 ? PAIR_BONUS : 0,
      penalty: info?.penalty ?? 0,
      runners: draft.runners,
    });
  }
  return umas;
}

function popularName(names: Map<string, number>) {
  const top = [...names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return top?.[0] || "Unnamed variant";
}

function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name);
}

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}
