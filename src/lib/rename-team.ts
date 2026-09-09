import { prisma } from "@/lib/prisma";
import { persistOverlayRow, loadOverlayRow } from "@/lib/overlay-store";
import { RESERVED_TEAM_SLUGS, slugifyTeamId, rewriteOverlayTeamIds } from "@/lib/team-slug";

export class TeamRenameError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function assertTeamSlug(raw: string) {
  const slug = slugifyTeamId(raw);
  if (!slug) throw new TeamRenameError("URL slug cannot be empty");
  if (RESERVED_TEAM_SLUGS.has(slug)) throw new TeamRenameError(`“${slug}” is reserved`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new TeamRenameError("URL slug can only use letters, numbers, and hyphens");
  }
  return slug;
}

export async function renameTeamId(oldId: string, nextSlug: string) {
  const newId = assertTeamSlug(nextSlug);
  if (newId === oldId) return oldId;

  const current = await prisma.team.findUnique({ where: { id: oldId } });
  if (!current) throw new TeamRenameError("team not found", 404);

  const taken = await prisma.team.findUnique({ where: { id: newId }, select: { id: true } });
  if (taken) throw new TeamRenameError(`URL “${newId}” is already used by another team`);

  await prisma.$transaction(async (tx) => {
    await tx.team.create({
      data: {
        id: newId,
        name: current.name,
        shortName: current.shortName,
        tagline: current.tagline,
        color: current.color,
        backgroundPath: current.backgroundPath,
        group: current.group,
        groupSlot: current.groupSlot,
        kind: current.kind,
      },
    });
    await tx.umaEntry.updateMany({ where: { teamId: oldId }, data: { teamId: newId } });
    await tx.matchTeam.updateMany({ where: { teamId: oldId }, data: { teamId: newId } });
    await tx.placement.updateMany({ where: { teamId: oldId }, data: { teamId: newId } });
    await tx.team.delete({ where: { id: oldId } });
  });

  const overlay = await loadOverlayRow();
  const gatesJson = rewriteOverlayTeamIds(overlay.gatesJson, oldId, newId);
  if (gatesJson !== overlay.gatesJson) {
    await persistOverlayRow({ ...overlay, gatesJson });
  }

  return newId;
}
