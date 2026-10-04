"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CATEGORY_LABEL } from "@/lib/constants";
import { gateKey } from "@/lib/overlay-gates";
import { spriteFileName, spriteLocalPath } from "@/lib/sprites";
import type { PublicMatch, PublicTeam } from "@/lib/types";

const STYLE_CHIP: Record<string, string> = {
  front: "Front",
  pace: "Pace",
  late: "Late",
  end: "End",
  runaway: "Front",
};

const GATE_INK = ["#2a241c", "#f7f3ea", "#f7f3ea", "#f7f3ea", "#2a241c", "#f7f3ea", "#f7f3ea", "#2a241c", "#f7f3ea"];
const GATE_FILL = ["#f4f0e6", "#2c2c2c", "#c44545", "#3a6fd0", "#e2b340", "#3d9458", "#d9783a", "#e7a0c0", "#7d62c8"];

type Runner = {
  key: string;
  teamId: string;
  slot: number;
  trainer: string;
  club: string;
  style: string;
  sprite: string | null;
  spriteId: string;
  color: string;
};

type GateSave = { teamId: string; slot: number; gate: number | null };

export function GateBoard({
  match,
  cat,
  teams,
  gatesAll,
  live,
  onSave,
}: {
  match: PublicMatch;
  cat: string;
  teams: PublicTeam[];
  gatesAll: Record<string, number>;
  live: boolean;
  onSave: (gates: GateSave[]) => Promise<boolean>;
}) {
  const runners = useMemo(() => runnersFor(match, cat, teams), [match, cat, teams]);
  const serverSlots = useMemo(() => slotsFrom(runners, gatesAll, match.id, cat), [runners, gatesAll, match.id, cat]);
  const [slots, setSlots] = useState(serverSlots);
  const [over, setOver] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ key: string; x: number; y: number } | null>(null);
  const [note, setNote] = useState("");
  const pending = useRef<string | null>(null);
  const saveId = useRef(0);
  const serverSlotsRef = useRef(serverSlots);
  serverSlotsRef.current = serverSlots;
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => {
    const incoming = signature(serverSlots);
    if (pending.current) {
      if (incoming === pending.current) pending.current = null;
      else return;
    }
    setSlots(serverSlots);
  }, [serverSlots]);

  const byKey = useMemo(() => new Map(runners.map((runner) => [runner.key, runner])), [runners]);
  const parked = runners.filter((runner) => !slots.includes(runner.key));
  const dragging = ghost ? byKey.get(ghost.key) : null;

  function commit(next: (string | null)[]) {
    if (signature(next) === signature(slotsRef.current)) return;
    const id = ++saveId.current;
    pending.current = signature(next);
    slotsRef.current = next;
    setSlots(next);
    setNote("Saving gates…");
    const gates = runners.map((runner) => {
      const index = next.indexOf(runner.key);
      return { teamId: runner.teamId, slot: runner.slot, gate: index >= 0 ? index + 1 : null };
    });
    void onSave(gates).then((ok) => {
      if (id !== saveId.current) return;
      if (!ok) {
        pending.current = null;
        slotsRef.current = serverSlotsRef.current;
        setSlots(serverSlotsRef.current);
        setNote("Gates did not save. The order was put back.");
        return;
      }
      setNote(live ? "Gates saved. The on-air strip is updating." : "Gates saved for this race.");
    });
  }

  function moveToGate(key: string, index: number) {
    const next = slots.slice();
    const from = next.indexOf(key);
    if (from === index) return;
    const occupant = next[index];
    if (from >= 0) next[from] = occupant;
    next[index] = key;
    commit(next);
  }

  function moveToPool(key: string) {
    const next = slots.slice();
    const from = next.indexOf(key);
    if (from < 0) return;
    next[from] = null;
    commit(next);
  }

  function dropOn(zone: string | null, key: string) {
    if (!zone) return;
    if (zone === "pool") moveToPool(key);
    else {
      const index = Number(zone);
      if (index >= 0 && index < 9) moveToGate(key, index);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-2 rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display-lg text-lg">
          Gates · {match.label} · {CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL] ?? cat}
        </h2>
        <p className="text-xs text-[var(--ink-soft)]">
          {note || (live ? "On air." : "Drag into a gate. Top is 1.")}
        </p>
      </div>
      <div className="grid min-h-0 flex-1 gap-2 sm:grid-cols-2">
        <div
          data-gate-drop="pool"
          className={`grid min-h-0 content-start gap-1 overflow-auto rounded-2xl p-1.5 ring-1 ${over === "pool" ? "bg-[var(--peach)] ring-[var(--coral)]" : "bg-[var(--paper)] ring-[var(--line)]"}`}
          onPointerUp={(event) => {
            if (!ghost) return;
            if (event.target === event.currentTarget) dropOn("pool", ghost.key);
          }}
        >
          <p className="px-1 text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Runners</p>
          {parked.length ? (
            parked.map((runner) => (
              <GateCard
                key={runner.key}
                runner={runner}
                hidden={ghost?.key === runner.key}
                onPointerDown={(event) => startDrag(event, runner.key, setGhost)}
                onPointerMove={(event) => moveDrag(event, ghost, setGhost, setOver)}
                onPointerUp={(event) => finishDrag(event, ghost, setGhost, setOver, dropOn)}
              />
            ))
          ) : (
            <p className="px-2 py-6 text-sm text-[var(--ink-soft)]">Everyone has a gate.</p>
          )}
        </div>
        <div className="flex min-h-0 flex-col gap-1 rounded-2xl bg-[var(--paper)] p-1.5 ring-1 ring-[var(--line)]">
          <p className="px-1 text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Gate order</p>
          <div className="grid min-h-0 flex-1 grid-rows-9 gap-1 overflow-auto">
          {slots.map((key, index) => {
            const runner = key ? byKey.get(key) : undefined;
            const hot = over === String(index);
            return (
              <div key={index} className="grid min-h-0 grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-1.5">
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold"
                  style={{ background: GATE_FILL[index], color: GATE_INK[index] }}
                >
                  {index + 1}
                </span>
                <div
                  data-gate-drop={String(index)}
                  className={`h-full min-h-9 rounded-lg ${hot ? "ring-2 ring-[var(--coral)]" : ""}`}
                >
                  {runner ? (
                    <GateCard
                      runner={runner}
                      hidden={ghost?.key === runner.key}
                      onPointerDown={(event) => startDrag(event, runner.key, setGhost)}
                      onPointerMove={(event) => moveDrag(event, ghost, setGhost, setOver)}
                      onPointerUp={(event) => finishDrag(event, ghost, setGhost, setOver, dropOn)}
                    />
                  ) : (
                    <div className="grid h-full min-h-9 place-items-center rounded-lg border border-dashed border-[var(--line-strong)] text-[0.65rem] text-[var(--ink-soft)]">
                      Gate {index + 1}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
      {dragging && ghost ? (
        <div className="pointer-events-none fixed z-50 w-80" style={{ left: ghost.x + 12, top: ghost.y + 12 }}>
          <GateCard runner={dragging} hidden={false} />
        </div>
      ) : null}
    </section>
  );
}

function GateCard({
  runner,
  hidden,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  runner: Runner;
  hidden: boolean;
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
  const local = spriteLocalPath(runner.spriteId);
  return (
    <article
      data-gate-card={runner.key}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="flex h-full min-h-9 cursor-grab touch-none items-center gap-1.5 rounded-lg bg-[var(--surface)] pr-1.5 ring-1 ring-[var(--line)] active:cursor-grabbing"
      style={{ boxShadow: `inset 4px 0 0 ${runner.color}`, visibility: hidden ? "hidden" : "visible" }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden">
        {runner.sprite || local ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={runner.sprite || local || ""}
            alt=""
            draggable={false}
            className="h-9 w-9 object-contain"
            onError={(event) => {
              if (!local || event.currentTarget.src.endsWith(local)) return;
              event.currentTarget.src = local;
            }}
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-tight">{runner.trainer}</span>
        <span className="block truncate text-[0.65rem] leading-tight text-[var(--ink-soft)]">{runner.club}</span>
      </span>
      <span className="shrink-0 rounded-full bg-[var(--paper-2)] px-1.5 py-0.5 text-[0.65rem] font-extrabold text-[var(--ink-soft)]">
        {runner.style}
      </span>
    </article>
  );
}

function startDrag(
  event: ReactPointerEvent<HTMLElement>,
  key: string,
  setGhost: (ghost: { key: string; x: number; y: number } | null) => void,
) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  setGhost({ key, x: event.clientX, y: event.clientY });
}

function moveDrag(
  event: ReactPointerEvent<HTMLElement>,
  ghost: { key: string; x: number; y: number } | null,
  setGhost: (ghost: { key: string; x: number; y: number } | null) => void,
  setOver: (zone: string | null) => void,
) {
  if (!ghost) return;
  setGhost({ key: ghost.key, x: event.clientX, y: event.clientY });
  setOver(zoneAt(event.clientX, event.clientY));
}

function finishDrag(
  event: ReactPointerEvent<HTMLElement>,
  ghost: { key: string; x: number; y: number } | null,
  setGhost: (ghost: { key: string; x: number; y: number } | null) => void,
  setOver: (zone: string | null) => void,
  dropOn: (zone: string | null, key: string) => void,
) {
  if (!ghost) return;
  dropOn(zoneAt(event.clientX, event.clientY), ghost.key);
  setGhost(null);
  setOver(null);
}

function zoneAt(x: number, y: number) {
  const nodes = document.elementsFromPoint(x, y);
  for (const node of nodes) {
    if (!(node instanceof Element)) continue;
    const zone = node.closest("[data-gate-drop]")?.getAttribute("data-gate-drop");
    if (zone) return zone;
  }
  return null;
}

function signature(slots: (string | null)[]) {
  return slots.map((key) => key ?? "").join("|");
}

function runnersFor(match: PublicMatch, cat: string, teams: PublicTeam[]): Runner[] {
  const out: Runner[] = [];
  for (const side of match.teams) {
    if (!side.teamId) continue;
    const team = teams.find((row) => row.id === side.teamId);
    const umas = team?.roster.filter((uma) => uma.category === cat).sort((a, b) => a.slot - b.slot) ?? [];
    for (let slot = 0; slot < 3; slot++) {
      const uma = umas.find((row) => row.slot === slot);
      const styleKey = uma?.style ?? "";
      out.push({
        key: `${side.teamId}:${slot}`,
        teamId: side.teamId,
        slot,
        trainer: uma?.trainer?.trim() || `Slot ${slot + 1}`,
        club: side.shortName || side.name,
        style: STYLE_CHIP[styleKey] || uma?.styleLabel || "—",
        sprite: uma?.spritePath || spriteFileName(uma?.spriteId) || null,
        spriteId: uma?.spriteId ?? "",
        color: side.color,
      });
    }
  }
  return out;
}

function slotsFrom(runners: Runner[], gatesAll: Record<string, number>, matchId: string, cat: string) {
  const slots: (string | null)[] = Array.from({ length: 9 }, () => null);
  for (const runner of runners) {
    const gate = gatesAll[gateKey(matchId, cat, runner.teamId, runner.slot)];
    if (gate >= 1 && gate <= 9 && slots[gate - 1] == null) slots[gate - 1] = runner.key;
  }
  return slots;
}
