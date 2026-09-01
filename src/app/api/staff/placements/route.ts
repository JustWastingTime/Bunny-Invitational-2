import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/constants";
import { seedKnockoutSlots } from "@/lib/advancement";
import { buildPublicPayload } from "@/lib/tournament";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });
  const body = (await request.json()) as {
    matchId?: string;
    category?: string;
    placements?: { place: number; teamId: string; slot: number }[];
  };
  if (!body.matchId || !body.category) {
    return NextResponse.json({ error: "matchId and category required" }, { status: 400 });
  }
  if (!CATEGORIES.includes(body.category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  const race = await prisma.race.upsert({
    where: { matchId_category: { matchId: body.matchId, category: body.category } },
    create: { matchId: body.matchId, category: body.category },
    update: {},
  });

  await prisma.placement.deleteMany({ where: { raceId: race.id } });
  for (const p of body.placements ?? []) {
    if (!p.teamId || p.place < 1 || p.place > 9) continue;
    await prisma.placement.create({
      data: { raceId: race.id, place: p.place, teamId: p.teamId, slot: p.slot },
    });
  }

  await seedKnockoutSlots();
  const payload = await buildPublicPayload();
  const match = payload.matches.find((m) => m.id === body.matchId);
  return NextResponse.json({ ok: true, match, groups: payload.groups });
}
