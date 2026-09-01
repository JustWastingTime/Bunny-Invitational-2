export type GateAssignment = { teamId: string; slot: number; gate: number };
export type OverlayFocus = { teamId: string; slot: number };

const FOCUS_KEY = "__focus";

export function parseGatesJson(raw: string | null | undefined): Record<string, number> {
  return parseOverlayBlob(raw).gates;
}

export function parseFocusJson(raw: string | null | undefined): OverlayFocus | null {
  return parseOverlayBlob(raw).focus;
}

export function parseOverlayBlob(raw: string | null | undefined): {
  gates: Record<string, number>;
  focus: OverlayFocus | null;
} {
  try {
    const parsed = JSON.parse(raw || "{}") as Record<string, unknown>;
    const gates: Record<string, number> = {};
    let focus: OverlayFocus | null = null;
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
      const n = Number(value);
      if (Number.isInteger(n) && n >= 1 && n <= 9) gates[key] = n;
    }
    return { gates, focus };
  } catch {
    return { gates: {}, focus: null };
  }
}

export function stringifyOverlayBlob(gates: Record<string, number>, focus: OverlayFocus | null) {
  const out: Record<string, number | string> = { ...gates };
  if (focus) out[FOCUS_KEY] = `${focus.teamId}|${focus.slot}`;
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
