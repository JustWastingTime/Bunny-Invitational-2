import { CATEGORIES, PLAY_IN_STAGE, STYLE_LABEL, TEAM_KIND_PLAYIN } from "./constants";
import { prisma } from "./prisma";
import { popularityFromRosters } from "./scoring";
import { plainSkillName } from "./skill-name";
import { parseSkills, spriteFileName } from "./sprites";
import { scoreMatch } from "./standings";
import { getTazunaCatalog } from "./tazuna-catalog";
import { buildStats } from "./tournament";
import type { PlayInPayload, PublicTeam, PublicUma, UmaFinishRecord } from "./types";
import { addFinish, emptyFinish, finishKey } from "./uma-finish";

export type { PlayInPayload };

function blankUma(category: string, slot: number): PublicUma {
  return {
    category,
    slot,
    trainer: "",
    umaName: "TBD",
    spriteId: "",
    spritePath: null,
    rating: null,
    score: null,
    style: null,
    styleLabel: null,
    aptitudes: { terrain: null, distance: null, style: null },
    stats: { speed: 0, stamina: 0, power: 0, guts: 0, wisdom: 0 },
    skills: [],
    isUnique: false,
    popularityRank: null,
    pickCount: 0,
  };
}

export async function buildPlayInRosters(): Promise<PlayInPayload> {
  const [teams, matches] = await Promise.all([
    prisma.team.findMany({
      where: { kind: TEAM_KIND_PLAYIN },
      include: { umaEntries: true },
    }),
    prisma.match.findMany({
      where: { stage: PLAY_IN_STAGE },
      include: { teams: true, races: { include: { placements: true } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  teams.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const rosterEntries = teams.flatMap((team) =>
    team.umaEntries.map((entry) => ({
      teamId: team.id,
      category: entry.category,
      slot: entry.slot,
      spriteId: entry.spriteId,
    })),
  );
  const pop = popularityFromRosters(rosterEntries);
  const finishes: Record<string, UmaFinishRecord> = {};
  const scoredMatches = matches.map((match) =>
    scoreMatch(
      {
        id: match.id,
        stage: match.stage,
        group: match.group,
        day: match.day,
        sortOrder: match.sortOrder,
        label: match.label,
        setNumber: match.setNumber,
        teams: match.teams.map((team) => ({ slot: team.slot, teamId: team.teamId })),
        races: match.races.map((race) => ({
          category: race.category,
          placements: race.placements.map((placement) => ({
            place: placement.place,
            teamId: placement.teamId,
            slot: placement.slot,
          })),
        })),
      },
      rosterEntries,
      pop,
    ),
  );

  for (const scored of scoredMatches) {
    for (const racer of scored.racers) {
      const key = finishKey(racer.teamId, racer.category, racer.slot);
      const record = finishes[key] ?? emptyFinish();
      addFinish(record, racer.place, racer.net);
      finishes[key] = record;
    }
  }

  const publicTeams: PublicTeam[] = teams.map((team) => ({
      id: team.id,
      name: team.name,
      shortName: team.shortName ?? team.name,
      tagline: team.tagline,
      color: team.color,
      backgroundPath: team.backgroundPath,
      group: team.group,
      groupSlot: team.groupSlot,
      kind: "playin",
      roster: CATEGORIES.flatMap((category) =>
        [0, 1, 2].map((slot) => {
          const entry = team.umaEntries.find((row) => row.category === category && row.slot === slot);
          if (!entry) return blankUma(category, slot);
          const info = pop.get(entry.spriteId);
          return {
            category,
            slot,
            trainer: entry.trainer,
            umaName: entry.umaName,
            spriteId: entry.spriteId,
            spritePath: spriteFileName(entry.spriteId),
            rating: entry.rating,
            score: entry.score,
            style: entry.style,
            styleLabel: entry.style ? (STYLE_LABEL[entry.style] ?? entry.style) : null,
            aptitudes: { terrain: entry.aptTerrain, distance: entry.aptDistance, style: entry.aptStyle },
            stats: {
              speed: entry.speed,
              stamina: entry.stamina,
              power: entry.power,
              guts: entry.guts,
              wisdom: entry.wisdom,
            },
            skills: parseSkills(entry.skillsJson),
            isUnique: info?.unique ?? false,
            popularityRank: info?.rank ?? null,
            pickCount: info?.count ?? 0,
          } satisfies PublicUma;
        }),
      ),
    }));

  const usedSkills = new Set(
    publicTeams.flatMap((team) => team.roster.flatMap((uma) => uma.skills.map(plainSkillName))),
  );
  const skillRarity: Record<string, string> = {};
  try {
    const catalog = await getTazunaCatalog();
    for (const skill of catalog.skills) {
      const label = plainSkillName(skill.name);
      if (usedSkills.has(label)) skillRarity[label] = skill.rarity || "normal";
    }
  } catch {
    /* chips fall back to white, and the first skill stays rainbow */
  }

  const stats = buildStats(
    publicTeams.map((team) => ({
      ...team,
      roster: team.roster.filter((uma) => uma.spriteId),
    })),
    CATEGORIES.map((category) => ({
      races: [
        {
          category,
          placements: scoredMatches.flatMap((scored) =>
            scored.racers
              .filter((racer) => racer.category === category)
              .map((racer) => ({
                place: racer.place,
                teamId: racer.teamId,
                slot: racer.slot,
                umaName: "",
                spriteId: racer.spriteId,
                net: racer.net,
              })),
          ),
        },
      ],
    })),
    pop,
    new Map(Object.entries(skillRarity)),
  );

  return {
    updatedAt: new Date().toISOString(),
    teams: publicTeams,
    skillRarity,
    finishes,
    stats,
  };
}
