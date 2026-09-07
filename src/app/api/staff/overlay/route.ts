import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import { mergeRaceGates, parseOverlayBlob, stringifyOverlayBlob } from "@/lib/overlay-gates";
import { loadOverlayRow, persistOverlayRow } from "@/lib/overlay-store";
import { noStoreHeaders } from "@/lib/no-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VIEWS = ["scoreboard", "matchup", "race", "groups", "pause"] as const;

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
    focus?: { teamId: string; slot: number } | null;
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
  let focus = blob.focus;
  if (body.gates && gateMatchId) {
    gates = mergeRaceGates(gates, gateMatchId, gateCat, body.gates);
  }
  if (body.focus === null || (view && view !== "matchup")) {
    focus = null;
  } else if (body.focus) {
    focus = body.focus;
  }

  const overlay = await persistOverlayRow({
    activeMatchId: body.activeMatchId !== undefined ? body.activeMatchId : current.activeMatchId,
    activeCategory: category ?? current.activeCategory,
    view: view ?? current.view,
    visible: body.visible !== undefined ? body.visible : current.visible,
    gatesJson: stringifyOverlayBlob(gates, focus),
  });
  return NextResponse.json({ ok: true, overlay, focus }, { headers: noStoreHeaders() });
}
