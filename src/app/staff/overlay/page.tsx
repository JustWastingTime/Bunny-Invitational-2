"use client";

import { memo, startTransition, useMemo, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/constants";
import { defaultGate, gateKey } from "@/lib/overlay-gates";
import { usePublicData } from "@/components/use-public-data";
import { PlayInSchedule } from "@/components/tournament-ui";
import { useStaffToast } from "@/components/staff-toast";
import type { PublicMatch, PublicRace, PublicTeam, PublicUma } from "@/lib/types";

const VIEWS = [
  { id: "matchup", label: "Show Match Up" },
  { id: "race", label: "Show Race" },
  // The gates strip only makes sense on the race scene, so this one stays
  // locked until Show Race has put us there.
  { id: "gates", label: "Show Gates", needsRace: true },
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

  const prepBoard = matchesForPrep(data.matches, stagedMatch);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="display-lg text-2xl">Overlay director</h1>
        <p className="text-sm text-[var(--ink-soft)]">
          OBS browser source: <code className="rounded bg-[var(--peach)] px-1">/obs</code>. Match and distance below are
          a prep desk — OBS only changes when you hit a Show button. Gates and the race result both apply to that same
          staged match.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_30rem]">
        <div className="grid gap-3">
          <div className="rounded-3xl bg-[var(--surface-strong)] p-3 ring-1 ring-[var(--line)]">
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
            {VIEWS.map((v) => {
              const locked = "needsRace" in v && !(o.view === "race" || o.view === "gates");
              const on = o.visible && o.view === v.id && !pending;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => goLive(v.id)}
                  disabled={busy || locked}
                  aria-pressed={on}
                  title={locked ? "Show Race first" : undefined}
                  className={`min-h-11 rounded-full px-4 py-2.5 ${on ? "bg-[var(--gold)]" : "bg-[var(--surface-strong)] ring-1 ring-[var(--line)]"} ${locked ? "cursor-not-allowed opacity-45" : ""}`}
                >
                  {v.label}
                </button>
              );
            })}
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

      {/* Bento: the match list runs the full height of the left column, the short
          cards stack beside it, and result entry gets the full width underneath.
          Placement is explicit at lg, so DOM order only decides the mobile stack. */}
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-3 lg:col-start-1 lg:row-start-1 lg:row-span-2">
          <p className="mb-2 text-sm text-[var(--ink-soft)]">
            Matches for the prep desk. Click one to stage it — OBS stays put until you Show.
          </p>
          {prepBoard.matches.length ? (
            <PlayInSchedule
              title={prepBoard.title}
              matches={prepBoard.matches}
              nowId={prepMatchId ?? o.activeMatchId}
              onPick={(id) => startTransition(() => setStagedMatchId(id))}
            />
          ) : (
            <p className="text-sm text-[var(--ink-soft)]">Pick a match in the dropdown to see its board.</p>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-3 lg:col-start-2 lg:row-start-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="display-lg text-lg">Uma detail · on-air matchup</h2>
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
            Pick a runner to swap the battle screen for a detail card. Works while Match Up is on air.
          </p>
          {o.view === "matchup" && o.visible ? (
            <div className="grid min-h-[15rem] grid-cols-1 gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((teamIndex) => {
                const rows = liveUmas.filter((row) => row.teamIndex === teamIndex);
                const team = rows[0];
                return (
                  <div
                    key={teamIndex}
                    className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-2xl p-2 ring-1 ring-[var(--line)]"
                    style={{
                      ["--team" as string]: team?.color ?? "#e07a5f",
                      background: "color-mix(in srgb, var(--team) 22%, var(--paper))",
                    }}
                  >
                    <p className="flex items-center gap-2 px-1 pt-1 text-xs font-extrabold uppercase tracking-wide">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: team?.color }} />
                      <span className="truncate">{team?.teamName ?? `Team ${teamIndex + 1}`}</span>
                    </p>
                    <div className="grid min-h-0 flex-1 grid-rows-3 gap-2">
                      {rows.map((row) => {
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
                            className={`flex h-full min-h-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center ring-1 ${
                              active
                                ? "bg-[var(--gold)]/55 ring-[var(--gold)]"
                                : "bg-[var(--surface-strong)]/85 ring-transparent"
                            }`}
                          >
                            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--paper)]">
                              {row.uma?.spritePath ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={row.uma.spritePath} alt="" className="h-16 w-16 object-contain" />
                              ) : (
                                <span className="text-[0.65rem] text-[var(--ink-soft)]">?</span>
                              )}
                            </span>
                            <span className="min-w-0 w-full">
                              <span className="block truncate text-sm font-semibold leading-tight">
                                {row.uma?.umaName || `Slot ${row.slot + 1}`}
                              </span>
                              <span className="block truncate text-xs text-[var(--ink-soft)]">
                                {row.uma?.trainer || "—"}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-soft)]">Show Match Up to pick a runner for the detail card.</p>
          )}
        </section>

        {stagedMatch ? (
          <div className="lg:col-start-2 lg:row-start-2">
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
          </div>
        ) : null}

        {stagedMatch ? (
          <div className="lg:col-span-2 lg:row-start-3">
            <ScoresCard
              key={`scores-${stagedMatch.id}-${cat}`}
              match={stagedMatch}
              cat={cat}
              teams={data.teams}
              existing={stagedMatch.races.find((r) => r.category === cat)}
            />
          </div>
        ) : null}
      </div>

      {status ? <p className="text-sm text-[var(--ink-soft)]">{status}</p> : null}
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
  if (view === "gates") return "Gates";
  if (view === "scoreboard") return "Scoreboard";
  if (view === "groups") return "Group table";
  if (view === "pause") return "Pause";
  return "Match up";
}

function matchesForPrep(matches: PublicMatch[], prep: PublicMatch | null) {
  if (!prep) return { title: "Matches", matches: [] as PublicMatch[] };
  if (prep.stage === "playin") {
    return { title: "Play-in", matches: matches.filter((m) => m.stage === "playin") };
  }
  if (prep.stage === "group" && prep.group) {
    return {
      title: `Group ${prep.group}`,
      matches: matches.filter((m) => m.stage === "group" && m.group === prep.group),
    };
  }
  if (prep.stage === "qf") {
    return { title: "Last Chance Qualifiers", matches: matches.filter((m) => m.stage === "qf") };
  }
  if (prep.stage === "semi") {
    return { title: "Semi Finals", matches: matches.filter((m) => m.stage === "semi") };
  }
  if (prep.stage === "gf") {
    return { title: "Grand Finals", matches: matches.filter((m) => m.stage === "gf") };
  }
  return { title: prep.label, matches: matches.filter((m) => m.stage === prep.stage) };
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
    <section className="grid gap-3 rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
      <h2 className="display-lg text-lg">
        Gates · {match.label} · {CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL] ?? cat}
      </h2>
      <p className="text-sm text-[var(--ink-soft)]">
        1–9, Japanese gate colors. Saving gates does not change the on-air overlay.
        {liveGates ? " These are the live race’s gates." : " Preparing a different race than OBS."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

// Race result entry. Lives here rather than on its own page because whoever
// calls the race on stream is the one holding the placements, and it reuses the
// staged match / distance picked above instead of asking for them twice.
function ScoresCard({
  match,
  cat,
  teams,
  existing,
}: {
  match: PublicMatch;
  cat: string;
  teams: PublicTeam[];
  existing: PublicRace | undefined;
}) {
  const toast = useStaffToast();
  const [places, setPlaces] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<PublicRace | null>(null);

  const racers = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    for (const t of match.teams) {
      if (!t.teamId) continue;
      const team = teams.find((x) => x.id === t.teamId);
      for (let slot = 0; slot < 3; slot++) {
        const uma = team?.roster.find((u) => u.category === cat && u.slot === slot);
        out.push({
          key: `${t.teamId}:${slot}`,
          label: `${t.name} · ${uma?.umaName ?? `slot ${slot + 1}`} (${uma?.trainer || "—"})`,
        });
      }
    }
    return out;
  }, [match, teams, cat]);

  const shown = saved ?? existing;
  const dirty = Object.keys(places).length > 0;

  function placeKey(p?: { teamId: string; slot: number }) {
    return p ? `${p.teamId}:${p.slot}` : "";
  }

  function setPlace(place: number, key: string) {
    setPlaces((prev) => {
      const next = { ...prev };
      for (const [p, v] of Object.entries(next)) {
        if (v === key) delete next[Number(p)];
      }
      if (key) next[place] = key;
      else delete next[place];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    toast.saving("Saving race…");
    const placements = Object.entries(places)
      .map(([place, key]) => {
        const [teamId, slot] = key.split(":");
        return { place: Number(place), teamId, slot: Number(slot) };
      })
      .filter((p) => p.teamId);
    try {
      const res = await fetch("/api/staff/placements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, category: cat, placements }),
      });
      const json = (await res.json()) as { error?: string; match?: PublicMatch };
      if (res.ok) {
        setSaved(json.match?.races.find((r) => r.category === cat) ?? null);
        setPlaces({});
        toast.saved("Race saved");
      } else {
        toast.error(json.error ?? "Failed");
      }
    } catch {
      toast.error("Failed — tap again");
    }
    setSaving(false);
  }

  return (
    <section className="grid gap-3 rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display-lg text-lg">
          Result · {match.label} · {CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL] ?? cat}
        </h2>
        <span className="text-xs text-[var(--ink-soft)]">
          {match.teams.map((t) => `${t.shortName || t.name} ${t.points}`).join(" · ")}
        </span>
      </div>
      <p className="text-sm text-[var(--ink-soft)]">
        Places 1–5 for the match staged above. Everyone else is scored from their own placement automatically.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((place) => (
          <label key={place} className="grid grid-cols-[2rem_1fr] items-center gap-2 text-sm">
            <span className="font-semibold">{place}</span>
            <select
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-2 py-1.5"
              value={places[place] ?? placeKey(shown?.placements.find((p) => p.place === place))}
              onChange={(e) => setPlace(place, e.target.value)}
            >
              <option value="">—</option>
              {racers.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {shown?.placements.length ? (
        <ul className="grid gap-0.5 text-sm text-[var(--ink-soft)] sm:grid-cols-2 lg:grid-cols-3">
          {shown.placements
            .filter((p) => p.place <= 5)
            .map((p) => (
              <li key={`in-${p.place}-${p.teamId}-${p.slot}`}>
                {p.place}. {p.umaName} → {p.net} pts
                {p.penalty ? ` (${p.penalty} pop)` : ""}
                {p.uniqueBonus ? ` (+${p.uniqueBonus} unique)` : ""}
              </li>
            ))}
          {shown.placements
            .filter((p) => p.place > 5 && p.penalty)
            .map((p) => (
              <li key={`out-${p.teamId}-${p.slot}`}>
                Outside top 5 · {p.umaName} → {p.net} pts ({p.penalty} pop)
              </li>
            ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="min-h-11 rounded-full bg-[var(--coral)] px-5 py-2 text-white disabled:opacity-45"
        >
          {saving ? "Saving…" : "Save race"}
        </button>
        {dirty ? <span className="text-xs text-[var(--coral-ink)]">Unsaved changes</span> : null}
      </div>
    </section>
  );
}
