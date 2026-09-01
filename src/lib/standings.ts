import { CATEGORIES, type Category } from "./constants";
import { scorePlacement, popForTeam, type PointBreakdown, type PopSource } from "./scoring";

export type MatchTeamRef = { slot: number; teamId: string | null };
export type PlacementRef = { place: number; teamId: string; slot: number };
export type RaceRef = { category: string; placements: PlacementRef[] };
export type MatchRef = {
  id: string;
  stage: string;
  group: string | null;
  day: number;
  sortOrder: number;
  label: string;
  setNumber: number | null;
  teams: MatchTeamRef[];
  races: RaceRef[];
};

export type RosterEntry = {
  teamId: string;
  category: string;
  slot: number;
  spriteId: string;
};

export type ScoredRacer = PlacementRef & PointBreakdown & { spriteId: string; category: string };

export function spriteForSlot(
  rosters: RosterEntry[],
  teamId: string,
  category: string,
  slot: number,
): string {
  return (
    rosters.find((r) => r.teamId === teamId && r.category === category && r.slot === slot)?.spriteId ??
    ""
  );
}

export function scoreMatch(
  match: MatchRef,
  rosters: RosterEntry[],
  pop: PopSource,
): {
  byTeam: Record<string, number>;
  racers: ScoredRacer[];
  winnerId: string | null;
  complete: boolean;
} {
  const byTeam: Record<string, number> = {};
  for (const t of match.teams) {
    if (t.teamId) byTeam[t.teamId] = 0;
  }
  const racers: ScoredRacer[] = [];
  const cats = match.stage === "gf" ? CATEGORIES : CATEGORIES;
  let completeRaces = 0;

  for (const cat of cats) {
    const race = match.races.find((r) => r.category === cat);
    const top = (race?.placements ?? []).filter((p) => p.place >= 1 && p.place <= 5);
    if (top.length >= 5) completeRaces += 1;
    for (const p of race?.placements ?? []) {
      const spriteId = spriteForSlot(rosters, p.teamId, cat, p.slot);
      const scored = scorePlacement(p.place, spriteId, popForTeam(pop, p.teamId));
      racers.push({ ...p, ...scored, spriteId, category: cat });
      if (p.teamId in byTeam) byTeam[p.teamId] += scored.net;
    }
    if (top.length >= 5) {
      const placed = new Set((race?.placements ?? []).map((p) => `${p.teamId}:${p.slot}`));
      let nextPlace = 6;
      for (const t of match.teams) {
        if (!t.teamId) continue;
        for (let slot = 0; slot < 3; slot++) {
          if (placed.has(`${t.teamId}:${slot}`)) continue;
          const spriteId = spriteForSlot(rosters, t.teamId, cat, slot);
          const scored = scorePlacement(nextPlace, spriteId, popForTeam(pop, t.teamId));
          racers.push({
            place: nextPlace,
            teamId: t.teamId,
            slot,
            ...scored,
            spriteId,
            category: cat,
          });
          byTeam[t.teamId] += scored.net;
          nextPlace += 1;
        }
      }
    }
  }

  const complete = completeRaces === CATEGORIES.length;
  const ranked = Object.entries(byTeam).sort((a, b) => b[1] - a[1]);
  const winnerId =
    complete && ranked.length && (ranked.length === 1 || ranked[0][1] > ranked[1][1])
      ? ranked[0][0]
      : null;

  return { byTeam, racers, winnerId, complete };
}

export type TeamStanding = {
  teamId: string;
  points: number;
  wins: number;
  firsts: number;
  matchesPlayed: number;
  rank: number;
};

export function groupStandings(
  group: string,
  teamIds: string[],
  matches: MatchRef[],
  rosters: RosterEntry[],
  pop: PopSource,
): TeamStanding[] {
  const groupMatches = matches.filter((m) => m.stage === "group" && m.group === group);
  const stats = new Map<string, TeamStanding>();
  for (const id of teamIds) {
    stats.set(id, { teamId: id, points: 0, wins: 0, firsts: 0, matchesPlayed: 0, rank: 0 });
  }

  const scoredMatches = groupMatches.map((m) => ({ match: m, scored: scoreMatch(m, rosters, pop) }));

  for (const { scored } of scoredMatches) {
    for (const [teamId, pts] of Object.entries(scored.byTeam)) {
      const row = stats.get(teamId);
      if (!row) continue;
      row.points += pts;
    }
    if (scored.complete) {
      for (const teamId of Object.keys(scored.byTeam)) {
        const row = stats.get(teamId);
        if (row) row.matchesPlayed += 1;
      }
      if (scored.winnerId) {
        const row = stats.get(scored.winnerId);
        if (row) row.wins += 1;
      }
    }
    for (const racer of scored.racers) {
      if (racer.place === 1) {
        const row = stats.get(racer.teamId);
        if (row) row.firsts += 1;
      }
    }
  }

  function h2h(a: string, b: string): number {
    const shared = scoredMatches.find(
      ({ match }) =>
        match.teams.some((t) => t.teamId === a) && match.teams.some((t) => t.teamId === b),
    );
    if (!shared) return 0;
    return (shared.scored.byTeam[a] ?? 0) - (shared.scored.byTeam[b] ?? 0);
  }

  const ranked = [...stats.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.firsts !== a.firsts) return b.firsts - a.firsts;
    const head = h2h(a.teamId, b.teamId);
    if (head !== 0) return -head;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.teamId.localeCompare(b.teamId);
  });

  ranked.forEach((row, i) => {
    row.rank = i + 1;
  });
  return ranked;
}

export function matchWinnerId(
  match: MatchRef,
  rosters: RosterEntry[],
  pop: PopSource,
): string | null {
  return scoreMatch(match, rosters, pop).winnerId;
}

export function grandFinalTotals(
  matches: MatchRef[],
  rosters: RosterEntry[],
  pop: PopSource,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const match of matches.filter((m) => m.stage === "gf")) {
    const scored = scoreMatch(match, rosters, pop);
    for (const [id, pts] of Object.entries(scored.byTeam)) {
      totals[id] = (totals[id] ?? 0) + pts;
    }
  }
  return totals;
}

export function nextCategory(category: string): Category | null {
  const i = CATEGORIES.indexOf(category as Category);
  if (i < 0 || i >= CATEGORIES.length - 1) return null;
  return CATEGORIES[i + 1];
}
