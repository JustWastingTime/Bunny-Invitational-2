import { prisma } from "./prisma";
import { CATEGORIES, PLAY_IN_TEAM_COUNT, TEAM_KIND_PLAYIN } from "./constants";

const PLAY_IN_COLORS = ["#7a5c52", "#c9a227", "#4a8a62", "#5c6bc0", "#b05c4a"];

export async function ensurePlayInTeams() {
  for (let i = 0; i < PLAY_IN_TEAM_COUNT; i++) {
    const id = `play-in-${i + 1}`;
    const existing = await prisma.team.findUnique({ where: { id } });
    if (existing) {
      if (existing.kind !== TEAM_KIND_PLAYIN) {
        await prisma.team.update({ where: { id }, data: { kind: TEAM_KIND_PLAYIN, group: null, groupSlot: null } });
      }
      continue;
    }
    await prisma.team.create({
      data: {
        id,
        name: `Play-in ${i + 1}`,
        shortName: `PI${i + 1}`,
        tagline: "Second-club play-in",
        color: PLAY_IN_COLORS[i] ?? "#7a5c52",
        kind: TEAM_KIND_PLAYIN,
      },
    });
    for (const category of CATEGORIES) {
      for (const slot of [0, 1, 2]) {
        await prisma.umaEntry.create({
          data: {
            teamId: id,
            category,
            slot,
            trainer: "",
            umaName: "TBD",
            spriteId: "",
          },
        });
      }
    }
  }
}
