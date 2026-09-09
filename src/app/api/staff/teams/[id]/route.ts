import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSkills, spriteFileName } from "@/lib/sprites";
import { STYLE_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const { id } = await params;
  const team = await prisma.team.findUnique({
    where: { id },
    include: { umaEntries: { orderBy: [{ category: "asc" }, { slot: "asc" }] } },
  });
  if (!team) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    id: team.id,
    name: team.name,
    shortName: team.shortName ?? team.name,
    tagline: team.tagline,
    color: team.color,
    backgroundPath: team.backgroundPath,
    roster: team.umaEntries.map((e) => ({
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
      isUnique: false,
      popularityRank: null,
      pickCount: 0,
    })),
  });
}
