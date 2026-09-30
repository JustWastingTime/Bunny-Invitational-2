import { NextResponse } from "next/server";
import { buildPlayInRosters } from "@/lib/play-in-rosters";
import { noStoreHeaders } from "@/lib/no-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await buildPlayInRosters(), { headers: noStoreHeaders() });
}
