import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TEAM_KIND_PLAYIN } from "@/lib/constants";
import { generateGroupMatches, seedKnockoutSlots } from "@/lib/advancement";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });
  const teams = await prisma.team.findMany({
    where: { kind: { not: TEAM_KIND_PLAYIN } },
    orderBy: [{ group: "asc" }, { groupSlot: "asc" }, { name: "asc" }],
    select: { id: true, name: true, shortName: true, color: true, group: true, groupSlot: true },
  });
  return NextResponse.json({ teams });
}

export async function PUT(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });
  const body = (await request.json()) as {
    assignments?: { id: string; group: string | null; groupSlot: number | null }[];
  };
  for (const row of body.assignments ?? []) {
    await prisma.team.update({
      where: { id: row.id },
      data: { group: row.group, groupSlot: row.groupSlot },
    });
  }
  await generateGroupMatches();
  await seedKnockoutSlots();
  return NextResponse.json({ ok: true });
}
