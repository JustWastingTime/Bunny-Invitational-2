import { NextResponse } from "next/server";
import { livePayload, loadOverlayRow } from "@/lib/overlay-store";
import { noStoreHeaders } from "@/lib/no-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const row = await loadOverlayRow();
  return NextResponse.json(livePayload(row), { headers: noStoreHeaders() });
}
