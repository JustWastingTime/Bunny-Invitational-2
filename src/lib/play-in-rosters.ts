import { CATEGORIES, STYLE_LABEL, TEAM_KIND_PLAYIN } from "./constants";
import { prisma } from "./prisma";
import { popularityFromRosters } from "./scoring";
import { parseSkills, spriteFileName } from "./sprites";
import type { PublicTeam, PublicUma } from "./types";

function blankUma(category: string, slot: number): PublicUma {
  return {
    category,
    slot,
    trainer: "",
    umaName: "TBD",
    spriteId: "",
    spritePath: null,
    rating: null,
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

export async function buildPlayInRosters(): Promise<{ updatedAt: string; teams: PublicTeam[] }> {
  const teams = await prisma.team.findMany({
    where: { kind: TEAM_KIND_PLAYIN },
    include: { umaEntries: true },
  });
  teams.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const pop = popularityFromRosters(teams.flatMap((team) => team.umaEntries));

  return {
    updatedAt: new Date().toISOString(),
    teams: teams.map((team) => ({
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
    })),
  };
}
