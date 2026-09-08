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
  rev: 0,
};

type Mem = { row: OverlayRow; stamp: string };
const g = globalThis as typeof globalThis & { __bunviOverlay?: Mem; __bunviOverlayRev?: number };

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
  if (row.rev != null) g.__bunviOverlayRev = Math.max(g.__bunviOverlayRev ?? 0, row.rev);
}

export function peekOverlay() {
  return g.__bunviOverlay ?? null;
}

async function kvCommand(command: unknown[], timeoutMs: number) {
  const creds = kvCreds();
  if (!creds) return null;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(creds.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
      signal: ac.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as { result?: unknown };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseKvRow(raw: unknown): OverlayRow | null {
  if (raw == null) return null;
  try {
    const row = JSON.parse(String(raw)) as OverlayRow;
    if (!row || typeof row !== "object") return null;
    return {
      activeMatchId: row.activeMatchId ?? null,
      activeCategory: row.activeCategory || "sprint",
      view: row.view || "matchup",
      visible: row.visible !== false,
      gatesJson: row.gatesJson || "{}",
      rev: Number(row.rev) || 0,
    };
  } catch {
    return null;
  }
}

async function kvGet(): Promise<OverlayRow | null> {
  const json = await kvCommand(["GET", KEY], 1500);
  return parseKvRow(json?.result);
}

async function kvSet(row: OverlayRow) {
  await kvCommand(["SET", KEY, JSON.stringify(row)], 2500);
}

export function asOverlayRow(row: {
  activeMatchId: string | null;
  activeCategory: string;
  view: string;
  visible: boolean;
  gatesJson: string;
  rev?: number;
}): OverlayRow {
  return {
    activeMatchId: row.activeMatchId,
    activeCategory: row.activeCategory,
    view: row.view,
    visible: row.visible,
    gatesJson: row.gatesJson,
    rev: row.rev ?? 0,
  };
}

async function writePrisma(next: OverlayRow) {
  await prisma.overlayState.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      activeMatchId: next.activeMatchId,
      activeCategory: next.activeCategory,
      view: next.view,
      visible: next.visible,
      gatesJson: next.gatesJson,
    },
    update: {
      activeMatchId: next.activeMatchId,
      activeCategory: next.activeCategory,
      view: next.view,
      visible: next.visible,
      gatesJson: next.gatesJson,
    },
  });
}

function newer(a: OverlayRow, b: OverlayRow) {
  return (a.rev ?? 0) >= (b.rev ?? 0) ? a : b;
}

export async function loadOverlayRow(): Promise<OverlayRow> {
  const mem = peekOverlay()?.row;
  if (hasOverlayKv()) {
    const cached = await kvGet();
    if (cached && mem) {
      const next = newer(mem, cached);
      rememberOverlay(next);
      return next;
    }
    if (cached) {
      rememberOverlay(cached);
      return cached;
    }
    if (mem) return mem;
    const row = await prisma.overlayState.findUnique({ where: { id: "default" } });
    return row ? asOverlayRow(row) : EMPTY_OVERLAY;
  }
  if (mem) return mem;
  const row = await prisma.overlayState.findUnique({ where: { id: "default" } });
  const next = row ? asOverlayRow(row) : EMPTY_OVERLAY;
  rememberOverlay(next);
  return next;
}

export async function persistOverlayRow(next: OverlayRow): Promise<OverlayRow> {
  const rev = Math.max(g.__bunviOverlayRev ?? 0, peekOverlay()?.row.rev ?? 0, next.rev ?? 0) + 1;
  g.__bunviOverlayRev = rev;
  const row = { ...next, rev };
  rememberOverlay(row);
  if (hasOverlayKv()) {
    await kvSet(row);
    after(() => {
      if (g.__bunviOverlayRev !== rev) return;
      void writePrisma(row).catch(() => undefined);
    });
    return row;
  }
  await writePrisma(row);
  return row;
}

export function livePayload(row: OverlayRow) {
  const overlay = overlayFromRow(row);
  return { overlay, stamp: overlay.stamp, rev: row.rev ?? 0 };
}
