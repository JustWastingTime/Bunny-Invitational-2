import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { generateGroupMatches, seedKnockoutSlots } from "@/lib/advancement";

export const dynamic = "force-dynamic";

export async function POST() {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });
  await generateGroupMatches();
  await seedKnockoutSlots();
  return NextResponse.json({ ok: true });
}
