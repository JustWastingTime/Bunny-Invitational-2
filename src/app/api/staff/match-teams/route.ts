import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });
  const body = (await request.json()) as {
    matchId?: string;
    teams?: { slot: number; teamId: string | null }[];
  };
  if (!body.matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });
  for (const row of body.teams ?? []) {
    await prisma.matchTeam.upsert({
      where: { matchId_slot: { matchId: body.matchId, slot: row.slot } },
      create: { matchId: body.matchId, slot: row.slot, teamId: row.teamId },
      update: { teamId: row.teamId },
    });
  }
  return NextResponse.json({ ok: true });
}
