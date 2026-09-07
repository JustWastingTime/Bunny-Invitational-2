import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { buildPublicPayload } from "@/lib/tournament";
import { noStoreHeaders } from "@/lib/no-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const staff = await requireStaff();
  if (!staff.ok) return NextResponse.json({ error: "forbidden" }, { status: staff.status });
  return NextResponse.json(await buildPublicPayload({ reveal: true }), { headers: noStoreHeaders() });
}
