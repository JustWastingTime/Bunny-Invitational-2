import { prisma } from "./prisma";
import { GROUPS, QF_SEEDS, SEMI_SEEDS, TEAM_KIND_PLAYIN } from "./constants";
import { groupStandings, matchWinnerId, type MatchRef, type RosterEntry } from "./standings";
import { splitPopularity } from "./scoring";

function toMatchRef(match: {
  id: string;
  stage: string;
  group: string | null;
  day: number;
  sortOrder: number;
  label: string;
  setNumber: number | null;
  teams: { slot: number; teamId: string | null }[];
  races: { category: string; placements: { place: number; teamId: string; slot: number }[] }[];
}): MatchRef {
  return match;
}

export async function loadEngineInput() {
  const [teams, matches] = await Promise.all([
    prisma.team.findMany({ include: { umaEntries: true } }),
    prisma.match.findMany({
      include: { teams: true, races: { include: { placements: true } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  const rosters: RosterEntry[] = teams.flatMap((t) =>
    t.umaEntries.map((e) => ({
      teamId: t.id,
      category: e.category,
      slot: e.slot,
      spriteId: e.spriteId,
    })),
  );
  const playInTeamIds = new Set(teams.filter((t) => t.kind === TEAM_KIND_PLAYIN).map((t) => t.id));
  const { forTeam: pop } = splitPopularity(rosters, playInTeamIds);
  const matchRefs = matches.map(toMatchRef);
  return { teams, matches, rosters, pop, matchRefs };
}

export async function seedKnockoutSlots() {
  const { teams, matchRefs, rosters, pop } = await loadEngineInput();
  const byGroup = new Map<string, string[]>();
  for (const g of GROUPS) {
    const ids = teams
      .filter((t) => t.kind !== TEAM_KIND_PLAYIN && t.group === g)
      .sort((a, b) => (a.groupSlot ?? 0) - (b.groupSlot ?? 0))
      .map((t) => t.id);
    byGroup.set(g, ids);
  }

  const groupTables = GROUPS.map((g) => ({
    group: g,
    table: groupStandings(g, byGroup.get(g) ?? [], matchRefs, rosters, pop),
  }));

  const groupsComplete = groupTables.every(({ group, table }) =>
    table.length === 7 && table.every((row) => row.matchesPlayed >= 3),
  );

  function teamAt(group: string, place: number): string | null {
    return groupTables.find((x) => x.group === group)?.table.find((r) => r.rank === place)?.teamId ?? null;
  }

  if (groupsComplete) {
    for (const qf of QF_SEEDS) {
      const ids = qf.picks.map(([g, place]) => teamAt(g, place));
      await writeMatchTeams(qf.id, ids);
    }
  }

  const qfWinners = new Map<string, string | null>();
  for (const qf of QF_SEEDS) {
    const match = matchRefs.find((m) => m.id === qf.id);
    qfWinners.set(qf.id, match ? matchWinnerId(match, rosters, pop) : null);
  }

  const allQfDone = [...qfWinners.values()].every(Boolean);
  if (groupsComplete && allQfDone) {
    for (const semi of SEMI_SEEDS) {
      const ids = [
        teamAt(semi.first[0], semi.first[1]),
        teamAt(semi.second[0], semi.second[1]),
        qfWinners.get(semi.qfId) ?? null,
      ];
      await writeMatchTeams(semi.id, ids);
    }
  }

  const semiWinners = SEMI_SEEDS.map((s) => {
    const match = matchRefs.find((m) => m.id === s.id);
    return match ? matchWinnerId(match, rosters, pop) : null;
  });
  if (semiWinners.every(Boolean)) {
    await writeMatchTeams("gf-1", semiWinners);
    await writeMatchTeams("gf-2", semiWinners);
  }
}

async function writeMatchTeams(matchId: string, teamIds: (string | null)[]) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { teams: true } });
  if (!match) return;
  for (let slot = 0; slot < 3; slot++) {
    const existing = match.teams.find((t) => t.slot === slot);
    const teamId = teamIds[slot] ?? null;
    if (existing) {
      await prisma.matchTeam.update({ where: { id: existing.id }, data: { teamId } });
    } else {
      await prisma.matchTeam.create({ data: { matchId, slot, teamId } });
    }
  }
}

export async function generateGroupMatches() {
  const { FANO_TRIPLES, GROUPS: groups } = await import("./constants");
  const teams = await prisma.team.findMany();
  for (const g of groups) {
    const members = teams
      .filter((t) => t.kind !== TEAM_KIND_PLAYIN && t.group === g)
      .sort((a, b) => (a.groupSlot ?? 0) - (b.groupSlot ?? 0));
    if (members.length !== 7) continue;
    for (let i = 0; i < FANO_TRIPLES.length; i++) {
      const triple = FANO_TRIPLES[i];
      const id = `group-${g.toLowerCase()}-${i + 1}`;
      const day = i < 5 ? 1 : 2;
      await prisma.match.upsert({
        where: { id },
        create: {
          id,
          stage: "group",
          group: g,
          day,
          sortOrder: (g.charCodeAt(0) - 65) * 10 + i + 1,
          label: `Group ${g} Match ${i + 1}`,
        },
        update: { day, label: `Group ${g} Match ${i + 1}` },
      });
      for (let slot = 0; slot < 3; slot++) {
        const teamId = members[triple[slot]]?.id ?? null;
        const existing = await prisma.matchTeam.findUnique({
          where: { matchId_slot: { matchId: id, slot } },
        });
        if (existing) {
          await prisma.matchTeam.update({ where: { id: existing.id }, data: { teamId } });
        } else {
          await prisma.matchTeam.create({ data: { matchId: id, slot, teamId } });
        }
      }
      await ensureRaces(id);
    }
  }
  await generatePlayInMatches();
  await ensureKnockoutShell();
}

export async function generatePlayInMatches() {
  const { FANO_TRIPLES, PLAY_IN_DAY, PLAY_IN_GROUP, PLAY_IN_STAGE, TEAM_KIND_PLAYIN } = await import("./constants");
  const teams = await prisma.team.findMany();
  const members = teams
    .filter((t) => t.kind === TEAM_KIND_PLAYIN)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  if (members.length !== 7) return;
  for (let i = 0; i < FANO_TRIPLES.length; i++) {
    const triple = FANO_TRIPLES[i];
    const id = `playin-${i + 1}`;
    const day = PLAY_IN_DAY;
    await prisma.match.upsert({
      where: { id },
      create: {
        id,
        stage: PLAY_IN_STAGE,
        group: PLAY_IN_GROUP,
        day,
        sortOrder: 90 + i,
        label: `Play-in Match ${i + 1}`,
      },
      update: { day, label: `Play-in Match ${i + 1}`, stage: PLAY_IN_STAGE, group: PLAY_IN_GROUP, sortOrder: 90 + i },
    });
    for (let slot = 0; slot < 3; slot++) {
      const teamId = members[triple[slot]]?.id ?? null;
      const existing = await prisma.matchTeam.findUnique({
        where: { matchId_slot: { matchId: id, slot } },
      });
      if (existing) {
        await prisma.matchTeam.update({ where: { id: existing.id }, data: { teamId } });
      } else {
        await prisma.matchTeam.create({ data: { matchId: id, slot, teamId } });
      }
    }
    await ensureRaces(id);
  }
}

export async function ensureKnockoutShell() {
  const knockout = [
    { id: "qf-1", stage: "qf", label: "Quarter Final 1", day: 2, sortOrder: 40 },
    { id: "qf-2", stage: "qf", label: "Quarter Final 2", day: 2, sortOrder: 41 },
    { id: "qf-3", stage: "qf", label: "Quarter Final 3", day: 2, sortOrder: 42 },
    { id: "semi-1", stage: "semi", label: "Semi Final 1", day: 2, sortOrder: 50 },
    { id: "semi-2", stage: "semi", label: "Semi Final 2", day: 2, sortOrder: 51 },
    { id: "semi-3", stage: "semi", label: "Semi Final 3", day: 2, sortOrder: 52 },
    { id: "gf-1", stage: "gf", label: "Grand Final — Set 1", day: 2, sortOrder: 60, setNumber: 1 },
    { id: "gf-2", stage: "gf", label: "Grand Final — Set 2", day: 2, sortOrder: 61, setNumber: 2 },
  ];
  for (const row of knockout) {
    await prisma.match.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        stage: row.stage,
        day: row.day,
        sortOrder: row.sortOrder,
        label: row.label,
        setNumber: row.setNumber ?? null,
      },
      update: { label: row.label, sortOrder: row.sortOrder },
    });
    for (let slot = 0; slot < 3; slot++) {
      const existing = await prisma.matchTeam.findUnique({
        where: { matchId_slot: { matchId: row.id, slot } },
      });
      if (!existing) {
        await prisma.matchTeam.create({ data: { matchId: row.id, slot, teamId: null } });
      }
    }
    await ensureRaces(row.id);
  }
}

async function ensureRaces(matchId: string) {
  const { CATEGORIES } = await import("./constants");
  for (const category of CATEGORIES) {
    await prisma.race.upsert({
      where: { matchId_category: { matchId, category } },
      create: { matchId, category },
      update: {},
    });
  }
}
