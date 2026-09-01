"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_LABEL, STYLES, STYLE_LABEL, TOURNAMENT_CATALOG_DATE, type Category } from "@/lib/constants";
import { spriteFileName } from "@/lib/sprites";
import type { PublicUma } from "@/lib/types";
import type { CatalogSkill, CatalogUma, TazunaCatalog } from "@/lib/tazuna-types";
import { SkillInput, UmaPicker, staffFieldClass as field } from "@/components/staff-pickers";

type FormUma = PublicUma;

const STATS = [
  { key: "speed", label: "Speed" },
  { key: "stamina", label: "Stamina" },
  { key: "power", label: "Power" },
  { key: "guts", label: "Guts" },
  { key: "wisdom", label: "Wisdom" },
] as const;

const APTS = [
  { key: "terrain", label: "Surface" },
  { key: "distance", label: "Distance" },
  { key: "style", label: "Style" },
] as const;

function emptyUma(category: string, slot: number): FormUma {
  return {
    category,
    slot,
    trainer: "",
    umaName: "",
    spriteId: "",
    spritePath: null,
    rating: "",
    style: "pace",
    styleLabel: STYLE_LABEL.pace,
    aptitudes: { terrain: "", distance: "", style: "" },
    stats: { speed: 0, stamina: 0, power: 0, guts: 0, wisdom: 0 },
    skills: [],
    isUnique: false,
    popularityRank: null,
    pickCount: 0,
  };
}

function padRoster(rows: PublicUma[]): FormUma[] {
  return CATEGORIES.flatMap((cat) =>
    [0, 1, 2].map((slot) => rows.find((u) => u.category === cat && u.slot === slot) ?? emptyUma(cat, slot)),
  );
}

function StatIcon({ kind }: { kind: (typeof STATS)[number]["key"] }) {
  const common = "h-3.5 w-3.5";
  if (kind === "speed") {
    return (
      <svg viewBox="0 0 16 16" className={common} aria-hidden>
        <path fill="currentColor" d="M2 9h7l-1.5 5L14 7H7l1.5-5z" />
      </svg>
    );
  }
  if (kind === "stamina") {
    return (
      <svg viewBox="0 0 16 16" className={common} aria-hidden>
        <path fill="currentColor" d="M8 14s-6-3.6-6-8a3.5 3.5 0 0 1 6-2.4A3.5 3.5 0 0 1 14 6c0 4.4-6 8-6 8z" />
      </svg>
    );
  }
  if (kind === "power") {
    return (
      <svg viewBox="0 0 16 16" className={common} aria-hidden>
        <path fill="currentColor" d="M6 2h4l1 4h2l-3 3 1 5-4-3-4 3 1-5-3-3h2z" />
      </svg>
    );
  }
  if (kind === "guts") {
    return (
      <svg viewBox="0 0 16 16" className={common} aria-hidden>
        <path fill="currentColor" d="M8 2c2 2.4 5 4 5 7.2A4.2 4.2 0 0 1 8 14a4.2 4.2 0 0 1-5-4.8C3 6 6 4.4 8 2z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className={common} aria-hidden>
      <path fill="currentColor" d="M8 1a5 5 0 0 0-2 9.6V13h4v-2.4A5 5 0 0 0 8 1zm-1 13h2v1H7z" />
    </svg>
  );
}

export default function RosterEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [clubCode, setClubCode] = useState("");
  const [tagline, setTagline] = useState("");
  const [color, setColor] = useState("#e07a5f");
  const [backgroundPath, setBackgroundPath] = useState<string | null>(null);
  const [bgUrl, setBgUrl] = useState("");
  const [roster, setRoster] = useState<FormUma[]>([]);
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState<Category>("sprint");
  const [asOf, setAsOf] = useState(TOURNAMENT_CATALOG_DATE);
  const [catalog, setCatalog] = useState<TazunaCatalog | null>(null);

  useEffect(() => {
    fetch("/api/public")
      .then((r) => r.json())
      .then((json) => {
        const team = json.teams.find((t: { id: string }) => t.id === id);
        if (!team) return;
        setClubCode(team.shortName || team.name);
        setTagline(team.tagline ?? "");
        setColor(team.color);
        setBackgroundPath(team.backgroundPath ?? null);
        setRoster(padRoster(team.roster));
      });
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/staff/catalog?asOf=${encodeURIComponent(asOf)}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "catalog failed");
        return json as TazunaCatalog;
      })
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setStatus(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [asOf]);

  function update(cat: string, slot: number, patch: Partial<FormUma>) {
    setRoster((rows) => rows.map((u) => (u.category === cat && u.slot === slot ? { ...u, ...patch } : u)));
  }

  function pickUma(cat: string, slot: number, uma: CatalogUma) {
    update(cat, slot, {
      umaName: uma.name,
      spriteId: uma.spriteId,
      spritePath: uma.thumbnail,
    });
  }

  async function save() {
    setStatus("Saving…");
    const res = await fetch("/api/staff/teams", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: clubCode.trim(),
        shortName: clubCode.trim(),
        tagline,
        color,
        roster: roster.map((u) => ({
          category: u.category,
          slot: u.slot,
          trainer: u.trainer,
          umaName: u.umaName || "TBD",
          spriteId: u.spriteId,
          rating: u.rating,
          style: u.style,
          aptTerrain: u.aptitudes.terrain,
          aptDistance: u.aptitudes.distance,
          aptStyle: u.aptitudes.style,
          speed: u.stats.speed,
          stamina: u.stats.stamina,
          power: u.stats.power,
          guts: u.stats.guts,
          wisdom: u.stats.wisdom,
          skills: u.skills,
        })),
      }),
    });
    setStatus(res.ok ? "Roster saved." : "Save failed");
  }

  async function uploadBackground(file: File) {
    setStatus("Uploading background…");
    const body = new FormData();
    body.set("teamId", id);
    body.set("file", file);
    const res = await fetch("/api/staff/teams/background", { method: "POST", body });
    const json = await res.json();
    if (!res.ok) {
      setStatus(json.error ?? "Upload failed");
      return;
    }
    setBackgroundPath(json.backgroundPath);
    setStatus("Background saved.");
  }

  async function saveBackgroundUrl() {
    if (!bgUrl.trim()) return;
    setStatus("Saving background…");
    const body = new FormData();
    body.set("teamId", id);
    body.set("url", bgUrl.trim());
    const res = await fetch("/api/staff/teams/background", { method: "POST", body });
    const json = await res.json();
    if (!res.ok) {
      setStatus(json.error ?? "Save failed");
      return;
    }
    setBackgroundPath(json.backgroundPath);
    setBgUrl("");
    setStatus("Background saved.");
  }

  async function clearBackground() {
    setStatus("Removing background…");
    const res = await fetch(`/api/staff/teams/background?teamId=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      setStatus("Could not remove background");
      return;
    }
    setBackgroundPath(null);
    setStatus("Background removed.");
  }

  const umas = catalog?.umas ?? [];
  const skills = catalog?.skills ?? [];
  const distanceRoster = useMemo(
    () => roster.filter((u) => u.category === tab).sort((a, b) => a.slot - b.slot),
    [roster, tab],
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/staff" className="text-sm text-[var(--coral-ink)]">
            ← Rosters
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Edit team</h1>
        </div>
        <button type="button" onClick={() => void save()} className="rounded-full bg-[var(--coral)] px-5 py-2 text-white">
          Save roster
        </button>
      </div>

      <section className="grid gap-4 rounded-3xl bg-white p-4 ring-1 ring-[var(--line)] lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Club code</span>
            <input className={field} value={clubCode} onChange={(e) => setClubCode(e.target.value)} placeholder="BUNS" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Motto</span>
            <input className={field} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Optional" />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Color</span>
            <span className="flex items-center gap-3">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--line)] bg-white" />
              <span className="h-10 flex-1 rounded-xl ring-1 ring-[var(--line)]" style={{ background: color }} />
              <span className="font-mono text-sm text-[var(--ink-soft)]">{color}</span>
            </span>
          </label>
        </div>
        <div className="grid gap-2">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Matchup background</p>
          {backgroundPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={backgroundPath} alt="" className="h-28 w-full rounded-2xl object-cover ring-1 ring-[var(--line)]" />
          ) : (
            <div className="grid h-28 place-items-center rounded-2xl bg-[var(--paper)] text-sm text-[var(--ink-soft)] ring-1 ring-[var(--line)]">
              No image yet
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-full bg-[var(--paper)] px-3 py-1.5 text-sm ring-1 ring-[var(--line)]">
              Upload
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void uploadBackground(file);
                }}
              />
            </label>
            {backgroundPath ? (
              <button type="button" onClick={() => void clearBackground()} className="rounded-full px-3 py-1.5 text-sm ring-1 ring-[var(--line)]">
                Remove
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <input className={field} value={bgUrl} onChange={(e) => setBgUrl(e.target.value)} placeholder="Image URL" />
            <button type="button" onClick={() => void saveBackgroundUrl()} className="shrink-0 rounded-full px-3 py-2 text-sm ring-1 ring-[var(--line)]">
              Use
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setTab(cat)}
                className={`rounded-full px-4 py-1.5 text-sm ${tab === cat ? "bg-[var(--coral)] text-white" : "bg-white/70 text-[var(--ink-soft)]"}`}
              >
                {CATEGORY_LABEL[cat]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
            Tazuna snapshot
            <input
              type="date"
              className="rounded-lg border border-[var(--line)] bg-white px-2 py-1"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
            {catalog ? (
              <span>
                {catalog.umas.length} umas · {catalog.skills.length} skills
              </span>
            ) : (
              <span>Picker loads in the background</span>
            )}
          </label>
        </div>

        <div className="grid gap-4">
          {distanceRoster.map((u) => (
            <UmaCard
              key={`${u.category}-${u.slot}`}
              uma={u}
              umas={umas}
              skills={skills}
              onChange={(patch) => update(u.category, u.slot, patch)}
              onPick={(picked) => pickUma(u.category, u.slot, picked)}
            />
          ))}
        </div>
      </section>

      <p className="text-sm">{status}</p>
    </div>
  );
}

function UmaCard({
  uma,
  umas,
  skills,
  onChange,
  onPick,
}: {
  uma: FormUma;
  umas: CatalogUma[];
  skills: CatalogSkill[];
  onChange: (patch: Partial<FormUma>) => void;
  onPick: (uma: CatalogUma) => void;
}) {
  const thumb = uma.spritePath || spriteFileName(uma.spriteId);
  return (
    <article className="rounded-3xl bg-white p-4 ring-1 ring-[var(--line)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Uma {uma.slot + 1}</h2>
        {uma.spriteId ? <span className="font-mono text-xs text-[var(--ink-soft)]">{uma.spriteId}</span> : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Trainer</span>
            <input className={field} value={uma.trainer} onChange={(e) => onChange({ trainer: e.target.value })} />
          </label>
          <UmaPicker umas={umas} value={uma.umaName} spriteId={uma.spriteId} onSelect={onPick} />
          {thumb && !umas.find((c) => c.spriteId === uma.spriteId) ? (
            <p className="text-xs text-[var(--ink-soft)]">Current art: {thumb}</p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Rating</span>
              <input className={field} value={uma.rating ?? ""} onChange={(e) => onChange({ rating: e.target.value })} placeholder="UG" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Style</span>
              <select
                className={field}
                value={STYLES.includes(uma.style as (typeof STYLES)[number]) ? uma.style ?? "" : ""}
                onChange={(e) => onChange({ style: e.target.value, styleLabel: STYLE_LABEL[e.target.value] ?? e.target.value })}
              >
                <option value="">Choose</option>
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {STYLE_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="grid gap-3">
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Aptitudes</p>
            <div className="grid grid-cols-3 gap-2">
              {APTS.map((apt) => (
                <label key={apt.key} className="grid gap-1">
                  <span className="text-[0.7rem] text-[var(--ink-soft)]">{apt.label}</span>
                  <input
                    className={`${field} text-center uppercase`}
                    value={uma.aptitudes[apt.key] ?? ""}
                    maxLength={2}
                    onChange={(e) => onChange({ aptitudes: { ...uma.aptitudes, [apt.key]: e.target.value.toUpperCase() } })}
                  />
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Stats</p>
            <div className="grid grid-cols-5 gap-2">
              {STATS.map((stat) => (
                <label key={stat.key} className="grid gap-1">
                  <span className="flex items-center gap-1 text-[0.7rem] text-[var(--ink-soft)]">
                    <StatIcon kind={stat.key} />
                    {stat.label}
                  </span>
                  <input
                    type="number"
                    className={field}
                    value={uma.stats[stat.key] || ""}
                    onChange={(e) => onChange({ stats: { ...uma.stats, [stat.key]: Number(e.target.value) } })}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <SkillInput skills={skills} value={uma.skills} onChange={(skills) => onChange({ skills })} />
      </div>
    </article>
  );
}
