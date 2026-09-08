"use client";

import { memo, startTransition, useMemo, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/constants";
import { defaultGate, gateKey } from "@/lib/overlay-gates";
import { usePublicData } from "@/components/use-public-data";
import { PlayInSchedule } from "@/components/tournament-ui";
import { useStaffToast } from "@/components/staff-toast";
import type { PublicMatch, PublicUma } from "@/lib/types";

const VIEWS = [
  { id: "matchup", label: "Show Match Up" },
  { id: "race", label: "Show Race" },
  { id: "scoreboard", label: "Show Scoreboard" },
  { id: "groups", label: "Show Group Table" },
  { id: "pause", label: "Show Pause" },
] as const;

export default function OverlayDirectorPage() {
  const { data } = usePublicData(4000, "staff");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useStaffToast();
  const [stagedMatchId, setStagedMatchId] = useState<string | null | undefined>(undefined);
  const [stagedCat, setStagedCat] = useState<string | null | undefined>(undefined);
  const [onAir, setOnAir] = useState<{
    view: string;
    visible: boolean;
    activeMatchId: string | null;
    activeCategory: string;
  } | null>(null);

  const o = onAir && data?.overlay
    ? { ...data.overlay, ...onAir }
    : data?.overlay;
  const liveMatch = useMemo(() => {
    if (!data) return null;
    return data.matches.find((m) => m.id === (o?.activeMatchId ?? "")) ?? data.matches[0] ?? null;
  }, [data, o?.activeMatchId]);

  const prepMatchId = stagedMatchId === undefined ? o?.activeMatchId ?? null : stagedMatchId;
  const cat = stagedCat || o?.activeCategory || "sprint";
  const liveCat = o?.activeCategory ?? "sprint";

  const stagedMatch = useMemo(() => {
    if (!data) return null;
    return data.matches.find((m) => m.id === (prepMatchId ?? "")) ?? liveMatch;
  }, [data, prepMatchId, liveMatch]);

  const pending = Boolean(o && (prepMatchId !== o.activeMatchId || cat !== liveCat));

  const liveQueue = useRef(Promise.resolve());
  const gateQueue = useRef(Promise.resolve());

  async function sendOverlay(body: Record<string, unknown>, retries: number) {
    let last = "Failed — tap again";
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch("/api/staff/overlay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          cache: "no-store",
          keepalive: true,
        });
        if (res.ok) {
          const json = (await res.json()) as {
            overlay?: { view: string; visible: boolean; activeMatchId: string | null; activeCategory: string };
          };
          if (json.overlay) {
            setOnAir({
              view: json.overlay.view,
              visible: json.overlay.visible,
              activeMatchId: json.overlay.activeMatchId,
              activeCategory: json.overlay.activeCategory,
            });
          }
          return true;
        }
        last = `Failed (${res.status}) — tap again`;
      } catch {
        last = "Failed — tap again";
      }
      await new Promise((resolve) => window.setTimeout(resolve, 280 * (attempt + 1)));
    }
    setStatus(last);
    return false;
  }

  function patchLive(body: Record<string, unknown>) {
    liveQueue.current = liveQueue.current.then(async () => {
      setBusy(true);
      toast.saving("Updating overlay…");
      const ok = await sendOverlay(body, 4);
      setBusy(false);
      if (ok) {
        setStatus("Overlay updated.");
        toast.saved("Overlay updated");
      } else {
        toast.error("Overlay update failed");
      }
    });
    return liveQueue.current;
  }

  function patchGate(body: Record<string, unknown>) {
    gateQueue.current = gateQueue.current.then(async () => {
      await sendOverlay(body, 1);
    });
  }

  function goLive(view: string) {
    setOnAir({
      view,
      visible: true,
      activeMatchId: prepMatchId,
      activeCategory: cat,
    });
    void patchLive({
      view,
      activeMatchId: prepMatchId,
      activeCategory: cat,
      visible: true,
      focus: null,
    });
  }

  if (!data || !o) return <p>Loading overlay director…</p>;

  const liveUmas = liveMatch
    ? liveMatch.teams.flatMap((t, teamIndex) => {
        const team = data.teams.find((x) => x.id === t.teamId);
        const umas = team?.roster.filter((u) => u.category === liveCat).sort((a, b) => a.slot - b.slot) ?? [];
        return [0, 1, 2].map((slot) => ({
          teamIndex,
          teamId: t.teamId,
          teamName: t.name,
          color: t.color,
          slot,
          uma: umas.find((u) => u.slot === slot) as PublicUma | undefined,
        }));
      })
    : [];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Overlay director</h1>
        <p className="text-sm text-[var(--ink-soft)]">
          OBS browser source: <code className="rounded bg-[var(--peach)] px-1">/obs</code>. Distance and match below are
          a prep desk — OBS only changes when you hit a Show button.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_30rem]">
        <div className="grid gap-4">
          <div className="rounded-3xl bg-[var(--surface-strong)] p-4 ring-1 ring-[var(--line)]">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">On air</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl">
              {o.visible === false
                ? "Hidden"
                : `${liveMatch?.label ?? "No match"} · ${CATEGORY_LABEL[liveCat as keyof typeof CATEGORY_LABEL] ?? liveCat} · ${liveViewLabel(o.view)}${
                    o.focus ? " · uma detail" : ""
                  }`}
            </p>
            {pending ? (
              <p className="mt-1 text-sm text-[var(--coral-ink)]">
                Preparing {stagedMatch?.label} · {CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL] ?? cat} — not on OBS
                yet.
              </p>
            ) : null}
          </div>

          <label className="grid gap-1 text-sm">
            Prep match
            <select
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2"
              value={prepMatchId ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                startTransition(() => setStagedMatchId(id));
              }}
            >
              <option value="">(auto)</option>
              {matchOptGroups(data.matches).map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => startTransition(() => setStagedCat(c))}
                className={`rounded-full px-4 py-2 text-sm ${cat === c ? "bg-[var(--coral)] text-white" : "bg-[var(--surface-strong)] ring-1 ring-[var(--line)]"}`}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => goLive(v.id)}
                disabled={busy}
                aria-pressed={o.visible && o.view === v.id && !pending}
                className={`min-h-11 rounded-full px-4 py-2.5 ${o.visible && o.view === v.id && !pending ? "bg-[var(--gold)]" : "bg-[var(--surface-strong)] ring-1 ring-[var(--line)]"}`}
              >
                {v.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setOnAir({
                  view: o.view,
                  visible: !o.visible,
                  activeMatchId: o.activeMatchId,
                  activeCategory: o.activeCategory,
                });
                void patchLive({ visible: !o.visible });
              }}
              disabled={busy}
              className="min-h-11 rounded-full bg-[var(--surface-strong)] px-4 py-2.5 ring-1 ring-[var(--line)]"
            >
              {o.visible ? "Hide overlay" : "Show overlay"}
            </button>
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">OBS preview</p>
          <div className="overflow-hidden rounded-2xl bg-black ring-1 ring-[var(--line)]">
            <div className="relative h-[270px] w-full">
            <ObsPreview />
            </div>
          </div>
        </div>
      </div>

      {data.matches.some((m) => m.stage === "playin") ? (
        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
          <p className="mb-3 text-sm text-[var(--ink-soft)]">
            Play-in uses the same Steiner triples as a group. Click a match to prep it — OBS stays put until you Show.
          </p>
          <PlayInSchedule
            matches={data.matches.filter((m) => m.stage === "playin")}
            nowId={prepMatchId ?? o.activeMatchId}
            onPick={(id) => startTransition(() => setStagedMatchId(id))}
          />
        </section>
      ) : null}

      {o.view === "matchup" && o.visible ? (
        <section className="grid gap-3 rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-xl">Uma detail · on-air matchup</h2>
            {o.focus ? (
              <button
                type="button"
                onClick={() => void patchLive({ view: "matchup", focus: null })}
                className="rounded-full bg-[var(--gold)] px-4 py-1.5 text-sm"
              >
                Back to matchup
              </button>
            ) : null}
          </div>
          <p className="text-sm text-[var(--ink-soft)]">
            Pick a runner to swap the battle screen for a detail card. OBS fades back when you hit Back to matchup.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {liveUmas.map((row) => {
              const active = o.focus?.teamId === row.teamId && o.focus?.slot === row.slot;
              return (
                <button
                  key={`${row.teamId ?? "x"}-${row.slot}`}
                  type="button"
                  disabled={!row.teamId}
                  onClick={() => {
                    if (!row.teamId) return;
                    if (active) {
                      void patchLive({ view: "matchup", focus: null });
                      return;
                    }
                    void patchLive({ view: "matchup", focus: { teamId: row.teamId, slot: row.slot } });
                  }}
                  className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-left ring-1 ${
                    active ? "bg-[var(--gold)]/50 ring-[var(--gold)]" : "bg-[var(--paper)] ring-[var(--line)]"
                  }`}
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--surface-strong)]">
                    {row.uma?.spritePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.uma.spritePath} alt="" className="h-12 w-12 object-contain" />
                    ) : (
                      <span className="text-[0.65rem] text-[var(--ink-soft)]">?</span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{row.uma?.umaName || `Slot ${row.slot + 1}`}</span>
                    <span className="block truncate text-xs text-[var(--ink-soft)]">
                      {row.teamName} · {row.uma?.trainer || "—"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {stagedMatch ? (
        <GatesCard
          key={`${stagedMatch.id}-${cat}`}
          match={stagedMatch}
          cat={cat}
          teams={data.teams}
          gatesAll={o.gatesAll ?? {}}
          liveMatchId={o.activeMatchId}
          liveCat={liveCat}
          onGate={(teamId, slot, gate) => {
            patchGate({
              gates: [{ teamId, slot, gate }],
              gateMatchId: stagedMatch.id,
              gateCategory: cat,
            });
          }}
        />
      ) : null}

      <p className="text-sm text-[var(--ink-soft)]">{status}</p>
    </div>
  );
}

const ObsPreview = memo(function ObsPreview() {
  return (
    <iframe
      title="Overlay preview"
      src="/obs?preview=1"
      className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
      style={{ width: 1920, height: 1080, transform: "scale(0.25)" }}
    />
  );
});

function liveViewLabel(view: string) {
  if (view === "race") return "Race";
  if (view === "scoreboard") return "Scoreboard";
  if (view === "groups") return "Group table";
  if (view === "pause") return "Pause";
  return "Match up";
}

function matchOptGroups(matches: PublicMatch[]) {
  const playin = matches.filter((m) => m.stage === "playin");
  const groups = ["A", "B", "C"].map((g) => ({
    label: `Group ${g}`,
    matches: matches.filter((m) => m.stage === "group" && m.group === g),
  }));
  const knockout = matches.filter((m) => m.stage !== "group" && m.stage !== "playin");
  return [
    ...(playin.length ? [{ label: "Play-in", matches: playin }] : []),
    ...groups.filter((g) => g.matches.length),
    ...(knockout.length ? [{ label: "Knockout", matches: knockout }] : []),
  ];
}

function GatesCard({
  match,
  cat,
  teams,
  gatesAll,
  liveMatchId,
  liveCat,
  onGate,
}: {
  match: PublicMatch;
  cat: string;
  teams: { id: string; roster: PublicUma[] }[];
  gatesAll: Record<string, number>;
  liveMatchId: string | null;
  liveCat: string;
  onGate: (teamId: string, slot: number, gate: number | null) => void;
}) {
  const liveGates = match.id === liveMatchId && cat === liveCat;
  return (
    <section className="grid gap-3 rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
      <h2 className="font-[family-name:var(--font-display)] text-xl">
        Gates · {match.label} · {CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL] ?? cat}
      </h2>
      <p className="text-sm text-[var(--ink-soft)]">
        1–9, Japanese gate colors. Saving gates does not change the on-air overlay.
        {liveGates ? " These are the live race’s gates." : " Preparing a different race than OBS."}
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {match.teams.map((t, teamIndex) => {
          const team = teams.find((x) => x.id === t.teamId);
          const umas = team?.roster.filter((u) => u.category === cat).sort((a, b) => a.slot - b.slot) ?? [];
          return (
            <div key={t.slot}>
              <p className="mb-2 font-semibold">{t.name}</p>
              <div className="grid gap-2">
                {[0, 1, 2].map((slot) => {
                  const uma = umas.find((u) => u.slot === slot);
                  const assigned = t.teamId ? gatesAll[gateKey(match.id, cat, t.teamId, slot)] : undefined;
                  return (
                    <label key={slot} className="grid grid-cols-[1fr_4.5rem] items-center gap-2 text-sm">
                      <span className="truncate">
                        {uma?.umaName || `Slot ${slot + 1}`}{" "}
                        <span className="text-[var(--ink-soft)]">({uma?.trainer || "—"})</span>
                      </span>
                      <GateField
                        assigned={assigned}
                        placeholder={String(defaultGate(teamIndex, slot))}
                        disabled={!t.teamId}
                        onCommit={(gate) => {
                          if (!t.teamId) return;
                          if (gate === (assigned ?? null)) return;
                          onGate(t.teamId, slot, gate);
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GateField({
  assigned,
  placeholder,
  disabled,
  onCommit,
}: {
  assigned: number | undefined;
  placeholder: string;
  disabled: boolean;
  onCommit: (gate: number | null) => void;
}) {
  const [value, setValue] = useState(assigned != null ? String(assigned) : "");
  return (
    <input
      type="number"
      min={1}
      max={9}
      className="rounded-xl border border-[var(--line)] px-2 py-1"
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const raw = value.trim();
        const gate = raw === "" ? null : Number(raw);
        onCommit(gate && gate >= 1 && gate <= 9 ? gate : null);
      }}
    />
  );
}
