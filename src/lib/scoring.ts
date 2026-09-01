import {
  PLACE_POINTS,
  POPULAR_PENALTY_FIRST,
  POPULAR_PENALTY_SECOND_THIRD,
  UNIQUE_BONUS,
  PAIR_BONUS,
} from "./constants";

export type PopularityInfo = {
  spriteId: string;
  count: number;
  rank: number;
  penalty: number;
  unique: boolean;
};

export type PointBreakdown = {
  base: number;
  penalty: number;
  uniqueBonus: number;
  net: number;
};

export function popularityFromRosters(
  entries: { spriteId: string | null | undefined }[],
): Map<string, PopularityInfo> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const id = String(entry.spriteId ?? "").trim();
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const result = new Map<string, PopularityInfo>();
  let lastCount = -1;
  let denseRank = 0;

  for (const [spriteId, count] of sorted) {
    if (count !== lastCount) {
      denseRank += 1;
      lastCount = count;
    }
    let penalty = 0;
    if (count > 1) {
      if (denseRank === 1) penalty = POPULAR_PENALTY_FIRST;
      else if (denseRank === 2 || denseRank === 3) penalty = POPULAR_PENALTY_SECOND_THIRD;
    }
    result.set(spriteId, {
      spriteId,
      count,
      rank: denseRank,
      penalty,
      unique: count === 1,
    });
  }
  return result;
}

export function scorePlacement(
  place: number,
  spriteId: string,
  pop: Map<string, PopularityInfo>,
): PointBreakdown {
  const base = PLACE_POINTS[place] ?? 0;
  const info = pop.get(String(spriteId));
  const penalty = info?.penalty ?? 0;
  let uniqueBonus = 0;
  if (base > 0 && info) {
    if (info.count === 1) uniqueBonus = UNIQUE_BONUS;
    else if (info.count === 2) uniqueBonus = PAIR_BONUS;
  }
  return {
    base,
    penalty,
    uniqueBonus,
    net: base + penalty + uniqueBonus,
  };
}

export type PopSource = Map<string, PopularityInfo> | ((teamId: string) => Map<string, PopularityInfo>);

export function popForTeam(pop: PopSource, teamId: string) {
  return typeof pop === "function" ? pop(teamId) : pop;
}

export function splitPopularity(
  rosters: { teamId: string; spriteId: string | null | undefined }[],
  playInTeamIds: Set<string>,
) {
  const main = popularityFromRosters(rosters.filter((r) => !playInTeamIds.has(r.teamId)));
  const playin = popularityFromRosters(rosters.filter((r) => playInTeamIds.has(r.teamId)));
  return {
    main,
    playin,
    forTeam: (teamId: string) => (playInTeamIds.has(teamId) ? playin : main),
  };
}
