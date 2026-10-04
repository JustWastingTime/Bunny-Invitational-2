import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import { mergeRaceGates, overlayFromRow, parseOverlayBlob, stringifyOverlayBlob } from "@/lib/overlay-gates";
import { loadOverlayRow, persistOverlayRow } from "@/lib/overlay-store";
import { noStoreHeaders } from "@/lib/no-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VIEWS = ["scoreboard", "matchup", "race", "gates", "groups", "pause", "slides", "ending"] as const;

export async function POST(request: Request) {
  return PUT(request);
}

export async function PUT(request: Request) {
  const staff = await requireStaff();
  if (!staff.ok) return NextResponse.json({ error: "forbidden" }, { status: staff.status });
  const body = (await request.json()) as {
    activeMatchId?: string | null;
    activeCategory?: string;
    view?: string;
    visible?: boolean;
    gates?: { teamId: string; slot: number; gate: number | null }[];
    gateMatchId?: string | null;
    gateCategory?: string;
    replaceGates?: boolean;
    focus?: { teamId: string; slot: number } | null;
    slide?: number;
  };
  const category = body.activeCategory && CATEGORIES.includes(body.activeCategory as (typeof CATEGORIES)[number])
    ? body.activeCategory
    : undefined;
  const view = VIEWS.includes(body.view as (typeof VIEWS)[number]) ? body.view : undefined;

  const current = await loadOverlayRow();

  const liveMatchId = body.activeMatchId !== undefined ? body.activeMatchId : current.activeMatchId;
  const gateMatchId = body.gateMatchId !== undefined ? body.gateMatchId : liveMatchId;
  const gateCat =
    (body.gateCategory && CATEGORIES.includes(body.gateCategory as (typeof CATEGORIES)[number])
      ? body.gateCategory
      : undefined) ?? category ?? current.activeCategory;

  const blob = parseOverlayBlob(current.gatesJson);
  let gates = blob.gates;
  if (body.replaceGates && gateMatchId) {
    const prefix = `${gateMatchId}|${gateCat}|`;
    for (const key of Object.keys(gates)) {
      if (key.startsWith(prefix)) delete gates[key];
    }
  }
  let focus = blob.focus;
  let slide = blob.slide;
  if (body.gates && gateMatchId) {
    gates = mergeRaceGates(gates, gateMatchId, gateCat, body.gates);
  }
  if (body.focus === null || (view && view !== "matchup")) {
    focus = null;
  } else if (body.focus) {
    focus = body.focus;
  }
  if (body.slide !== undefined && Number.isFinite(Number(body.slide))) {
    slide = Math.max(0, Math.min(500, Math.trunc(Number(body.slide))));
  }

  const overlay = await persistOverlayRow({
    activeMatchId: body.activeMatchId !== undefined ? body.activeMatchId : current.activeMatchId,
    activeCategory: category ?? current.activeCategory,
    view: view ?? current.view,
    visible: body.visible !== undefined ? body.visible : current.visible,
    gatesJson: stringifyOverlayBlob(gates, focus, slide),
  });
  return NextResponse.json({ ok: true, overlay: overlayFromRow(overlay), focus }, { headers: noStoreHeaders() });
}
