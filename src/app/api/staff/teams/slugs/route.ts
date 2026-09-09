import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renameTeamId, TeamRenameError } from "@/lib/rename-team";
import { suggestedTeamSlug } from "@/lib/team-slug";

export const dynamic = "force-dynamic";

export async function POST() {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const teams = await prisma.team.findMany({
    select: { id: true, name: true, shortName: true },
    orderBy: { name: "asc" },
  });

  const claimed = new Set(teams.map((t) => t.id));
  const renamed: { from: string; to: string }[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const team of teams) {
    const next = suggestedTeamSlug(team.shortName, team.name);
    if (!next || next === team.id) {
      skipped.push({ id: team.id, reason: next === team.id ? "already matches club code" : "empty slug" });
      continue;
    }
    if (claimed.has(next)) {
      skipped.push({ id: team.id, reason: `“${next}” is already taken` });
      continue;
    }
    try {
      const to = await renameTeamId(team.id, next);
      claimed.delete(team.id);
      claimed.add(to);
      renamed.push({ from: team.id, to });
    } catch (err) {
      skipped.push({
        id: team.id,
        reason: err instanceof TeamRenameError ? err.message : "rename failed",
      });
    }
  }

  return NextResponse.json({ ok: true, renamed, skipped });
}
