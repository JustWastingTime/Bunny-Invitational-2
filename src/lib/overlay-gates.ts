export type GateAssignment = { teamId: string; slot: number; gate: number };
export type OverlayFocus = { teamId: string; slot: number };

const FOCUS_KEY = "__focus";
const SLIDE_KEY = "__slide";

export function parseGatesJson(raw: string | null | undefined): Record<string, number> {
  return parseOverlayBlob(raw).gates;
}

export function parseFocusJson(raw: string | null | undefined): OverlayFocus | null {
  return parseOverlayBlob(raw).focus;
}

export function parseOverlayBlob(raw: string | null | undefined): {
  gates: Record<string, number>;
  focus: OverlayFocus | null;
  slide: number;
} {
  try {
    const parsed = JSON.parse(raw || "{}") as Record<string, unknown>;
    const gates: Record<string, number> = {};
    let focus: OverlayFocus | null = null;
    let slide = 0;
    for (const [key, value] of Object.entries(parsed)) {
      if (key === FOCUS_KEY && typeof value === "string") {
        const split = value.lastIndexOf("|");
        if (split > 0) {
          const teamId = value.slice(0, split);
          const slot = Number(value.slice(split + 1));
          if (teamId && Number.isInteger(slot)) focus = { teamId, slot };
        }
        continue;
      }
      if (key === SLIDE_KEY) {
        const n = Number(value);
        if (Number.isInteger(n) && n >= 0) slide = n;
        continue;
      }
      const n = Number(value);
      if (Number.isInteger(n) && n >= 1 && n <= 9) gates[key] = n;
    }
    return { gates, focus, slide };
  } catch {
    return { gates: {}, focus: null, slide: 0 };
  }
}

export function stringifyOverlayBlob(gates: Record<string, number>, focus: OverlayFocus | null, slide = 0) {
  const out: Record<string, number | string> = { ...gates };
  if (focus) out[FOCUS_KEY] = `${focus.teamId}|${focus.slot}`;
  if (slide > 0) out[SLIDE_KEY] = slide;
  return JSON.stringify(out);
}

export function gateKey(matchId: string, category: string, teamId: string, slot: number) {
  return `${matchId}|${category}|${teamId}|${slot}`;
}

export function gatesForRace(
  map: Record<string, number>,
  matchId: string,
  category: string,
): GateAssignment[] {
  const prefix = `${matchId}|${category}|`;
  const out: GateAssignment[] = [];
  for (const [key, gate] of Object.entries(map)) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const split = rest.lastIndexOf("|");
    if (split < 0) continue;
    const teamId = rest.slice(0, split);
    const slot = Number(rest.slice(split + 1));
    if (!teamId || !Number.isInteger(slot)) continue;
    out.push({ teamId, slot, gate });
  }
  return out;
}

export function mergeRaceGates(
  map: Record<string, number>,
  matchId: string,
  category: string,
  assignments: { teamId: string; slot: number; gate: number | null }[],
) {
  const next = { ...map };
  for (const row of assignments) {
    const key = gateKey(matchId, category, row.teamId, row.slot);
    if (row.gate == null) delete next[key];
    else next[key] = row.gate;
  }
  return next;
}

export function defaultGate(teamIndex: number, slot: number) {
  return teamIndex * 3 + slot + 1;
}

export type OverlayRow = {
  activeMatchId: string | null;
  activeCategory: string;
  view: string;
  visible: boolean;
  gatesJson: string;
  rev?: number;
};

export function overlayStamp(row: OverlayRow) {
  return `${row.rev ?? 0}|${row.visible ? 1 : 0}|${row.view}|${row.activeMatchId ?? ""}|${row.activeCategory}|${row.gatesJson}`;
}

export function overlayFromRow(row: OverlayRow) {
  const blob = parseOverlayBlob(row.gatesJson);
  return {
    activeMatchId: row.activeMatchId,
    activeCategory: row.activeCategory,
    view: row.view,
    visible: row.visible,
    gates: row.activeMatchId ? gatesForRace(blob.gates, row.activeMatchId, row.activeCategory) : [],
    gatesAll: blob.gates,
    focus: blob.focus,
    slide: blob.slide,
    stamp: overlayStamp(row),
  };
}
