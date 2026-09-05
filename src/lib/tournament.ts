import { prisma } from "./prisma";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  GROUPS,
  PLACE_POINTS,
  STYLE_LABEL,
  TEAM_KIND_PLAYIN,
  TOURNAMENT_NAME,
  PLAY_IN_GROUP,
  PLAY_IN_STAGE,
  type Category,
} from "./constants";
import { splitPopularity } from "./scoring";
import {
  grandFinalTotals,
  groupStandings,
  nextCategory,
  scoreMatch,
  type MatchRef,
  type RosterEntry,
} from "./standings";
import { parseSkills, spriteFileName } from "./sprites";
import { gatesForRace, parseFocusJson, parseGatesJson } from "./overlay-gates";

export async function buildPublicPayload() {
  const [teams, matches, overlay] = await Promise.all([
    prisma.team.findMany({ include: { umaEntries: true }, orderBy: [{ group: "asc" }, { groupSlot: "asc" }, { name: "asc" }] }),
    prisma.match.findMany({
      include: { teams: true, races: { include: { placements: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.overlayState.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    }),
  ]);

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const rosters: RosterEntry[] = teams.flatMap((t) =>
    t.umaEntries.map((e) => ({
      teamId: t.id,
      category: e.category,
      slot: e.slot,
      spriteId: e.spriteId,
    })),
  );
  const playInTeamIds = new Set(teams.filter((t) => t.kind === TEAM_KIND_PLAYIN).map((t) => t.id));
  const { main: pop, playin: playInPop, forTeam } = splitPopularity(rosters, playInTeamIds);
  const matchRefs: MatchRef[] = matches;

  const publicTeams = teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName ?? t.name,
    tagline: t.tagline,
    color: t.color,
    backgroundPath: t.backgroundPath,
    group: t.group,
    groupSlot: t.groupSlot,
    kind: t.kind === TEAM_KIND_PLAYIN ? "playin" : "main",
    roster: t.umaEntries.map((e) => {
      const pool = t.kind === TEAM_KIND_PLAYIN ? playInPop : pop;
      return {
      category: e.category,
      slot: e.slot,
      trainer: e.trainer,
      umaName: e.umaName,
      spriteId: e.spriteId,
      spritePath: spriteFileName(e.spriteId),
      rating: e.rating,
      style: e.style,
      styleLabel: e.style ? STYLE_LABEL[e.style] ?? e.style : null,
      aptitudes: { terrain: e.aptTerrain, distance: e.aptDistance, style: e.aptStyle },
      stats: { speed: e.speed, stamina: e.stamina, power: e.power, guts: e.guts, wisdom: e.wisdom },
      skills: parseSkills(e.skillsJson),
      isUnique: pool.get(e.spriteId)?.unique ?? false,
      popularityRank: pool.get(e.spriteId)?.rank ?? null,
      pickCount: pool.get(e.spriteId)?.count ?? 0,
    };
    }),
  }));

  const publicMatches = matches.map((m) => {
    const scored = scoreMatch(m, rosters, forTeam);
    return {
      id: m.id,
      stage: m.stage,
      group: m.group,
      day: m.day,
      sortOrder: m.sortOrder,
      label: m.label,
      setNumber: m.setNumber,
      complete: scored.complete,
      winnerId: scored.winnerId,
      teamPoints: scored.byTeam,
      teams: [...m.teams]
        .sort((a, b) => a.slot - b.slot)
        .map((slot) => {
          const team = slot.teamId ? teamById.get(slot.teamId) : null;
          return {
            slot: slot.slot,
            teamId: slot.teamId,
            name: team?.name ?? "TBD",
            shortName: team?.shortName ?? team?.name ?? "TBD",
            color: team?.color ?? "#c9a227",
            points: slot.teamId ? scored.byTeam[slot.teamId] ?? 0 : 0,
          };
        }),
      races: CATEGORIES.map((category) => {
        return {
          category,
          label: CATEGORY_LABEL[category],
          placements: scored.racers
            .filter((r) => r.category === category)
            .sort((a, b) => a.place - b.place)
            .map((p) => {
              const team = teamById.get(p.teamId);
              const entry = team?.umaEntries.find((e) => e.category === category && e.slot === p.slot);
              return {
                place: p.place,
                teamId: p.teamId,
                teamName: team?.name ?? p.teamId,
                teamColor: team?.color ?? "#c9a227",
                slot: p.slot,
                trainer: entry?.trainer ?? "",
                umaName: entry?.umaName ?? "Unknown",
                spriteId: entry?.spriteId ?? p.spriteId,
                spritePath: spriteFileName(entry?.spriteId ?? p.spriteId),
                base: p.base,
                penalty: p.penalty,
                uniqueBonus: p.uniqueBonus,
                net: p.net,
              };
            }),
        };
      }),
    };
  });

  const groups = GROUPS.map((g) => {
    const ids = teams.filter((t) => t.kind !== TEAM_KIND_PLAYIN && t.group === g).map((t) => t.id);
    const table = groupStandings(g, ids, matchRefs, rosters, forTeam);
    return {
      id: g,
      standings: table.map((row) => {
        const team = teamById.get(row.teamId);
        return {
          ...row,
          name: team?.name ?? row.teamId,
          shortName: team?.shortName ?? team?.name ?? row.teamId,
          color: team?.color ?? "#c9a227",
        };
      }),
    };
  });

  const playInIds = teams.filter((t) => t.kind === TEAM_KIND_PLAYIN).map((t) => t.id);
  const playInTable = groupStandings(PLAY_IN_GROUP, playInIds, matchRefs, rosters, forTeam, PLAY_IN_STAGE);
  const playIn = {
    standings: playInTable.map((row) => {
      const team = teamById.get(row.teamId);
      return {
        ...row,
        name: team?.name ?? row.teamId,
        shortName: team?.shortName ?? team?.name ?? row.teamId,
        color: team?.color ?? "#c9a227",
      };
    }),
  };

  const gfTotals = grandFinalTotals(matchRefs, rosters, forTeam);
  const gfTeams = Object.entries(gfTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([teamId, points], i) => {
      const team = teamById.get(teamId);
      return {
        rank: i + 1,
        teamId,
        name: team?.name ?? teamId,
        shortName: team?.shortName ?? team?.name ?? teamId,
        color: team?.color ?? "#c9a227",
        points,
      };
    });

  const nowNext = resolveNowNext(publicMatches, overlay);
  const stats = buildStats(
    publicTeams
      .filter((t) => t.kind !== "playin")
      .map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      color: t.color,
      roster: t.roster,
    })),
    publicMatches,
    pop,
  );

  return {
    tournament: TOURNAMENT_NAME,
    updatedAt: new Date().toISOString(),
    scoring: { place: PLACE_POINTS, uniqueBonus: 2, popular: { 1: -2, 2: -1, 3: -1 } },
    overlay: {
      activeMatchId: overlay.activeMatchId,
      activeCategory: overlay.activeCategory,
      view: overlay.view,
      visible: overlay.visible,
      gates: overlay.activeMatchId
        ? gatesForRace(
            parseGatesJson(overlay.gatesJson),
            overlay.activeMatchId,
            overlay.activeCategory,
          )
        : [],
      gatesAll: parseGatesJson(overlay.gatesJson),
      focus: parseFocusJson(overlay.gatesJson),
    },
    now: nowNext.now,
    next: nowNext.next,
    teams: publicTeams,
    matches: publicMatches,
    groups,
    playIn,
    grandFinal: gfTeams,
    stats,
  };
}

function resolveNowNext(
  matches: {
    id: string;
    label: string;
    sortOrder: number;
    complete: boolean;
    teams: { name: string; color: string }[];
    races: { category: string; label: string; placements: unknown[] }[];
  }[],
  overlay: { activeMatchId: string | null; activeCategory: string },
) {
  const nowMatch = overlay.activeMatchId
    ? matches.find((m) => m.id === overlay.activeMatchId)
    : matches.find((m) => !m.complete) ?? matches[0];
  if (!nowMatch) return { now: null, next: null };

  const cat = (overlay.activeCategory as Category) || "sprint";
  const now = toCue(nowMatch, cat);
  const followingCat = nextCategory(cat);
  if (followingCat) return { now, next: toCue(nowMatch, followingCat) };
  const nextMatch = matches.find((m) => m.sortOrder > nowMatch.sortOrder);
  if (!nextMatch) return { now, next: null };
  return { now, next: toCue(nextMatch, "sprint") };
}

function toCue(
  match: { id: string; label: string; teams: { name: string; color: string }[] },
  category: Category,
) {
  return {
    matchId: match.id,
    matchLabel: match.label,
    category,
    categoryLabel: CATEGORY_LABEL[category] ?? category,
    teams: match.teams.map((t) => ({ name: t.name, color: t.color })),
  };
}

function umaBaseName(name: string) {
  return name.replace(/\s*\(.*\)\s*$/, "").trim();
}

function buildStats(
  teams: {
    id: string;
    name: string;
    shortName: string;
    color: string;
    roster: {
      umaName: string;
      spriteId: string;
      skills: string[];
      stats: { speed: number; stamina: number; power: number; guts: number; wisdom: number };
      aptitudes: { terrain: string | null; distance: string | null; style: string | null };
      isUnique: boolean;
    }[];
  }[],
  matches: { races: { category: string; placements: { place: number; teamId: string; slot: number; umaName: string; spriteId: string; net: number }[] }[] }[],
  pop: ReturnType<typeof popularityFromRosters>,
) {
  type UmaAgg = {
    spriteId: string;
    name: string;
    baseName: string;
    count: number;
    starts: number;
    wins: number;
    top5: number;
  };
  const bySprite = new Map<string, UmaAgg>();
  const skillCounts = new Map<string, number>();

  for (const team of teams) {
    for (const u of team.roster) {
      const cur = bySprite.get(u.spriteId) ?? {
        spriteId: u.spriteId,
        name: u.umaName,
        baseName: umaBaseName(u.umaName),
        count: 0,
        starts: 0,
        wins: 0,
        top5: 0,
      };
      cur.count += 1;
      bySprite.set(u.spriteId, cur);
      for (const skill of u.skills) {
        skillCounts.set(skill, (skillCounts.get(skill) ?? 0) + 1);
      }
    }
  }

  for (const match of matches) {
    for (const race of match.races) {
      for (const p of race.placements) {
        const row = bySprite.get(p.spriteId);
        if (!row) continue;
        row.starts += 1;
        if (p.place === 1) row.wins += 1;
        if (p.place <= 5) row.top5 += 1;
      }
    }
  }

  const umaPopulation = [...bySprite.values()]
    .map((u) => ({
      ...u,
      unique: pop.get(u.spriteId)?.unique ?? u.count === 1,
      popularityRank: pop.get(u.spriteId)?.rank ?? null,
      winRate: u.starts ? u.wins / u.starts : 0,
      top5Rate: u.starts ? u.top5 / u.starts : 0,
    }))
    .sort((a, b) => b.count - a.count || b.wins - a.wins || a.name.localeCompare(b.name));

  const combined = new Map<string, { name: string; count: number }>();
  for (const u of umaPopulation) {
    const cur = combined.get(u.baseName) ?? { name: u.baseName, count: 0 };
    cur.count += u.count;
    combined.set(u.baseName, cur);
  }

  const teamPower = teams.map((t) => {
    let totalStats = 0;
    let skills = 0;
    for (const u of t.roster) {
      const spd = u.stats.speed * (u.aptitudes.distance === "S" ? 1.1 : 1);
      const pow = u.stats.power * (u.aptitudes.terrain === "S" ? 1.1 : 1);
      const wit = u.stats.wisdom * (u.aptitudes.style === "S" ? 1.1 : 1);
      totalStats += spd + u.stats.stamina + pow + u.stats.guts + wit;
      skills += u.skills.length;
    }
    return {
      teamId: t.id,
      name: t.name,
      shortName: t.shortName,
      color: t.color,
      totalStats: Math.round(totalStats),
      skills,
      uniquePicks: t.roster.filter((u) => u.isUnique).length,
    };
  });

  const skillList = [...skillCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    uniqueCount: umaPopulation.filter((u) => u.unique).length,
    mostPopular: umaPopulation[0] ?? null,
    mostPopularCombined: [...combined.values()].sort((a, b) => b.count - a.count)[0] ?? null,
    umaPopulation,
    skillsCommon: skillList.slice(0, 12),
    skillsRare: [...skillList].filter((s) => s.count >= 1).sort((a, b) => a.count - b.count || a.name.localeCompare(b.name)).slice(0, 12),
    teamPowerByStats: [...teamPower].sort((a, b) => b.totalStats - a.totalStats),
    teamPowerBySkills: [...teamPower].sort((a, b) => b.skills - a.skills),
    mostUniqueTeam: [...teamPower].sort((a, b) => b.uniquePicks - a.uniquePicks)[0] ?? null,
  };
}
