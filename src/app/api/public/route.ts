import { NextResponse } from "next/server";
import { buildPublicPayload } from "@/lib/tournament";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await buildPublicPayload();
  return NextResponse.json(payload);
}
