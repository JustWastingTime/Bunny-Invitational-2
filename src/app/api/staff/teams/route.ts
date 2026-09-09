import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/constants";
import { renameTeamId, TeamRenameError } from "@/lib/rename-team";

export const dynamic = "force-dynamic";

type RosterPayload = {
  category: string;
  slot: number;
  trainer?: string;
  umaName?: string;
  spriteId?: string;
  rating?: string | null;
  style?: string | null;
  aptTerrain?: string | null;
  aptDistance?: string | null;
  aptStyle?: string | null;
  speed?: number;
  stamina?: number;
  power?: number;
  guts?: number;
  wisdom?: number;
  skills?: string[];
};

export async function PUT(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });
  const body = (await request.json()) as {
    id?: string;
    slug?: string;
    name?: string;
    shortName?: string | null;
    tagline?: string | null;
    color?: string;
    backgroundPath?: string | null;
    roster?: RosterPayload[];
  };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let teamId = body.id;
  if (body.slug && body.slug !== body.id) {
    try {
      teamId = await renameTeamId(body.id, body.slug);
    } catch (err) {
      if (err instanceof TeamRenameError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }
  }

  await prisma.team.update({
    where: { id: teamId },
    data: {
      name: body.name,
      shortName: body.shortName ?? body.name ?? "",
      tagline: body.tagline,
      color: body.color,
      ...(body.backgroundPath !== undefined ? { backgroundPath: body.backgroundPath || null } : {}),
    },
  });

  if (body.roster) {
    const rows = body.roster.filter((row) => CATEGORIES.includes(row.category as (typeof CATEGORIES)[number]));
    await prisma.$transaction(
      rows.map((row) =>
        prisma.umaEntry.upsert({
          where: {
            teamId_category_slot: { teamId, category: row.category, slot: row.slot },
          },
          create: {
            teamId,
            category: row.category,
            slot: row.slot,
            trainer: row.trainer ?? "",
            umaName: row.umaName ?? "TBD",
            spriteId: String(row.spriteId ?? ""),
            rating: row.rating,
            style: row.style,
            aptTerrain: row.aptTerrain,
            aptDistance: row.aptDistance,
            aptStyle: row.aptStyle,
            speed: row.speed ?? 0,
            stamina: row.stamina ?? 0,
            power: row.power ?? 0,
            guts: row.guts ?? 0,
            wisdom: row.wisdom ?? 0,
            skillsJson: JSON.stringify(row.skills ?? []),
          },
          update: {
            trainer: row.trainer ?? "",
            umaName: row.umaName ?? "TBD",
            spriteId: String(row.spriteId ?? ""),
            rating: row.rating,
            style: row.style,
            aptTerrain: row.aptTerrain,
            aptDistance: row.aptDistance,
            aptStyle: row.aptStyle,
            speed: row.speed ?? 0,
            stamina: row.stamina ?? 0,
            power: row.power ?? 0,
            guts: row.guts ?? 0,
            wisdom: row.wisdom ?? 0,
            skillsJson: JSON.stringify(row.skills ?? []),
          },
        }),
      ),
    );
  }

  return NextResponse.json({ ok: true, id: teamId });
}
