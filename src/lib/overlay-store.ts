import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { overlayFromRow, overlayStamp, type OverlayRow } from "@/lib/overlay-gates";

const KEY = "bunvi:overlay";
export const EMPTY_OVERLAY: OverlayRow = {
  activeMatchId: null,
  activeCategory: "sprint",
  view: "matchup",
  visible: true,
  gatesJson: "{}",
};

type Mem = { row: OverlayRow; stamp: string };
const g = globalThis as typeof globalThis & { __bunviOverlay?: Mem };

function kvCreds() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function hasOverlayKv() {
  return Boolean(kvCreds());
}

export function rememberOverlay(row: OverlayRow) {
  g.__bunviOverlay = { row, stamp: overlayStamp(row) };
}

export function peekOverlay() {
  return g.__bunviOverlay ?? null;
}

async function kvCommand(command: unknown[]) {
  const creds = kvCreds();
  if (!creds) return null;
  const res = await fetch(creds.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as { result?: unknown };
}

async function kvGet(): Promise<OverlayRow | null> {
  const json = await kvCommand(["GET", KEY]);
  if (!json || json.result == null) return null;
  try {
    const row = JSON.parse(String(json.result)) as OverlayRow;
    if (!row || typeof row !== "object") return null;
    return {
      activeMatchId: row.activeMatchId ?? null,
      activeCategory: row.activeCategory || "sprint",
      view: row.view || "matchup",
      visible: row.visible !== false,
      gatesJson: row.gatesJson || "{}",
    };
  } catch {
    return null;
  }
}

async function kvSet(row: OverlayRow) {
  await kvCommand(["SET", KEY, JSON.stringify(row)]);
}

export function asOverlayRow(row: {
  activeMatchId: string | null;
  activeCategory: string;
  view: string;
  visible: boolean;
  gatesJson: string;
}): OverlayRow {
  return {
    activeMatchId: row.activeMatchId,
    activeCategory: row.activeCategory,
    view: row.view,
    visible: row.visible,
    gatesJson: row.gatesJson,
  };
}

async function writePrisma(next: OverlayRow) {
  await prisma.overlayState.upsert({
    where: { id: "default" },
    create: { id: "default", ...next },
    update: next,
  });
}

export async function loadOverlayRow(): Promise<OverlayRow> {
  const cached = await kvGet();
  if (cached) {
    rememberOverlay(cached);
    return cached;
  }
  const row = await prisma.overlayState.findUnique({ where: { id: "default" } });
  const next = row ? asOverlayRow(row) : EMPTY_OVERLAY;
  rememberOverlay(next);
  return next;
}

export async function persistOverlayRow(next: OverlayRow): Promise<OverlayRow> {
  rememberOverlay(next);
  if (hasOverlayKv()) {
    await kvSet(next);
    after(() => {
      void writePrisma(next).catch(() => undefined);
    });
    return next;
  }
  await writePrisma(next);
  return next;
}

export function livePayload(row: OverlayRow) {
  const overlay = overlayFromRow(row);
  return { overlay, stamp: overlay.stamp };
}
