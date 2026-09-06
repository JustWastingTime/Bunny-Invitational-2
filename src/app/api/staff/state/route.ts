import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { buildPublicPayload } from "@/lib/tournament";

export const dynamic = "force-dynamic";

export async function GET() {
  const staff = await requireStaff();
  if (!staff.ok) return NextResponse.json({ error: "forbidden" }, { status: staff.status });
  return NextResponse.json(await buildPublicPayload({ reveal: true }));
}
