import { parseOverlayBlob, stringifyOverlayBlob } from "@/lib/overlay-gates";

export const RESERVED_TEAM_SLUGS = new Set(["background", "slugs"]);

export function slugifyTeamId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function suggestedTeamSlug(clubCode: string | null | undefined, name?: string | null) {
  return slugifyTeamId(clubCode || name || "");
}

export function rewriteOverlayTeamIds(gatesJson: string, oldId: string, newId: string) {
  if (oldId === newId) return gatesJson;
  const { gates, focus } = parseOverlayBlob(gatesJson);
  const next: Record<string, number> = {};
  for (const [key, gate] of Object.entries(gates)) {
    const last = key.lastIndexOf("|");
    if (last < 0) {
      next[key] = gate;
      continue;
    }
    const slotPart = key.slice(last + 1);
    const rest = key.slice(0, last);
    const first = rest.indexOf("|");
    const second = first >= 0 ? rest.indexOf("|", first + 1) : -1;
    if (second < 0) {
      next[key] = gate;
      continue;
    }
    const matchId = rest.slice(0, first);
    const category = rest.slice(first + 1, second);
    const teamId = rest.slice(second + 1);
    const rewritten = `${matchId}|${category}|${teamId === oldId ? newId : teamId}|${slotPart}`;
    next[rewritten] = gate;
  }
  const nextFocus = focus && focus.teamId === oldId ? { teamId: newId, slot: focus.slot } : focus;
  return stringifyOverlayBlob(next, nextFocus);
}
