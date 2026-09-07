import { NextResponse } from "next/server";
import { buildPublicPayload } from "@/lib/tournament";
import { noStoreHeaders } from "@/lib/no-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const payload = await buildPublicPayload({ reveal: true });
  return NextResponse.json(
    {
      overlay: payload.overlay,
      now: payload.now,
      next: payload.next,
      match: payload.matches.find((m) => m.id === payload.overlay.activeMatchId) ?? payload.matches[0] ?? null,
      teams: payload.teams,
      groups: payload.groups,
      playIn: payload.playIn,
      grandFinal: payload.grandFinal,
    },
    { headers: noStoreHeaders() },
  );
}
