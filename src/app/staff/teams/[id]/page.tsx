"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, CATEGORY_LABEL, STYLES, STYLE_LABEL, type Category } from "@/lib/constants";
import { importUmaJson, type ImportedUma } from "@/lib/uma-import";
import { spriteFileName } from "@/lib/sprites";
import type { PublicUma } from "@/lib/types";
import type { CatalogSkill, CatalogUma, TazunaCatalog } from "@/lib/tazuna-types";
import { SkillInput, UmaPicker, staffFieldClass as field } from "@/components/staff-pickers";
import { useStaffToast } from "@/components/staff-toast";
import { suggestedTeamSlug } from "@/lib/team-slug";

type FormUma = PublicUma & { entered: boolean; styleWarn: boolean };

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
    score: "",
    style: "pace",
    styleLabel: STYLE_LABEL.pace,
    aptitudes: { terrain: "", distance: "", style: "" },
    stats: { speed: 0, stamina: 0, power: 0, guts: 0, wisdom: 0 },
    skills: [],
    entered: false,
    styleWarn: false,
    isUnique: false,
    popularityRank: null,
    pickCount: 0,
  };
}

function padRoster(rows: (PublicUma & { entered?: boolean; styleWarn?: boolean })[]): FormUma[] {
  return CATEGORIES.flatMap((cat) =>
    [0, 1, 2].map((slot) => {
      const found = rows.find((u) => u.category === cat && u.slot === slot);
      if (!found) return emptyUma(cat, slot);
      return { ...found, entered: Boolean(found.entered), styleWarn: Boolean(found.styleWarn) };
    }),
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
  const [slug, setSlug] = useState(id);
  const [tagline, setTagline] = useState("");
  const [color, setColor] = useState("#e07a5f");
  const [backgroundPath, setBackgroundPath] = useState<string | null>(null);
  const [bgUrl, setBgUrl] = useState("");
  const [roster, setRoster] = useState<FormUma[]>([]);
  const [status, setStatus] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "unsaved" | "saving" | "saved">("idle");
  const [tab, setTab] = useState<Category>("sprint");
  const [catalog, setCatalog] = useState<TazunaCatalog | null>(null);
  const toast = useStaffToast();
  const router = useRouter();
  const ready = useRef(false);
  const firstReady = useRef(true);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    ready.current = false;
    firstReady.current = true;
    fetch(`/api/staff/teams/${encodeURIComponent(id)}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Could not load team");
        return json as {
          id: string;
          name: string;
          shortName: string;
          tagline: string | null;
          color: string;
          backgroundPath: string | null;
          roster: FormUma[];
        };
      })
      .then((team) => {
        setClubCode(team.shortName || team.name);
        setSlug(team.id);
        setTagline(team.tagline ?? "");
        setColor(team.color);
        setBackgroundPath(team.backgroundPath ?? null);
        setRoster(padRoster(team.roster));
        ready.current = true;
      })
      .catch((err: Error) => setStatus(err.message));
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/staff/catalog")
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
  }, []);

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
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveState("saving");
    toast.saving("Saving roster…");
    try {
      const res = await fetch("/api/staff/teams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          slug: slug.trim(),
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
            score: u.score,
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
            entered: u.entered,
            styleWarn: u.styleWarn,
          })),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
      if (res.ok) {
        dirtyRef.current = false;
        setSaveState("saved");
        toast.saved("Roster saved");
        const nextId = json.id ?? id;
        if (nextId !== id) {
          router.replace(`/staff/teams/${nextId}`);
          router.refresh();
        }
      } else {
        setSaveState("unsaved");
        toast.error(json.error ?? "Roster save failed");
      }
    } finally {
      savingRef.current = false;
    }
  }

  useEffect(() => {
    if (!ready.current) return;
    if (firstReady.current) {
      firstReady.current = false;
      return;
    }
    dirtyRef.current = true;
    setSaveState("unsaved");
  }, [clubCode, slug, tagline, color, roster]);

  function leaveMessage() {
    if (savingRef.current) return "Still saving. Wait until it finishes.";
    if (dirtyRef.current) return "You have unsaved roster changes.";
    return "";
  }

  function canLeave() {
    if (savingRef.current) {
      toast.error("Still saving — wait until it finishes");
      return false;
    }
    if (!dirtyRef.current) return true;
    return window.confirm("You have unsaved roster changes. Leave this page?");
  }

  function goRosters() {
    if (!canLeave()) return;
    dirtyRef.current = false;
    router.push("/staff");
  }

  useEffect(() => {
    history.pushState({ rosterGuard: true }, "", window.location.href);

    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!savingRef.current && !dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = leaveMessage();
    }

    function onPopState() {
      if (savingRef.current) {
        history.pushState({ rosterGuard: true }, "", window.location.href);
        toast.error("Still saving — wait until it finishes");
        return;
      }
      if (dirtyRef.current && !window.confirm("You have unsaved roster changes. Leave this page?")) {
        history.pushState({ rosterGuard: true }, "", window.location.href);
        return;
      }
      dirtyRef.current = false;
    }

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const link = target?.closest("a[href]");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || link.getAttribute("target") === "_blank") return;
      if (savingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        toast.error("Still saving — wait until it finishes");
        return;
      }
      if (dirtyRef.current && !window.confirm("You have unsaved roster changes. Leave this page?")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      dirtyRef.current = false;
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick, true);
    };
    // toast helpers stay valid via context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadBackground(file: File) {
    setStatus("Uploading background…");
    toast.saving("Uploading background…");
    const body = new FormData();
    body.set("teamId", id);
    body.set("file", file);
    const res = await fetch("/api/staff/teams/background", { method: "POST", body });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Upload failed");
      return;
    }
    setBackgroundPath(json.backgroundPath);
    toast.saved("Background saved");
  }

  async function saveBackgroundUrl() {
    if (!bgUrl.trim()) return;
    toast.saving("Saving background…");
    const body = new FormData();
    body.set("teamId", id);
    body.set("url", bgUrl.trim());
    const res = await fetch("/api/staff/teams/background", { method: "POST", body });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Save failed");
      return;
    }
    setBackgroundPath(json.backgroundPath);
    setBgUrl("");
    toast.saved("Background saved");
  }

  async function clearBackground() {
    toast.saving("Removing background…");
    const res = await fetch(`/api/staff/teams/background?teamId=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove background");
      return;
    }
    setBackgroundPath(null);
    toast.saved("Background removed");
  }

  const umas = catalog?.umas ?? [];
  const skills = catalog?.skills ?? [];
  const distanceRoster = useMemo(
    () => roster.filter((u) => u.category === tab).sort((a, b) => a.slot - b.slot),
    [roster, tab],
  );
  const inputted = roster.filter((u) => u.entered).length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={goRosters}
            disabled={saveState === "saving"}
            className="text-sm text-[var(--coral-ink)] disabled:opacity-50"
          >
            ← Rosters
          </button>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Edit team</h1>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saveState === "saving"}
          className="rounded-full bg-[var(--coral)] px-5 py-2 text-white"
        >
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "unsaved" ? "Save now" : "Save roster"}
        </button>
      </div>

      <section className="grid gap-4 rounded-3xl bg-[var(--surface-strong)] p-4 ring-1 ring-[var(--line)] lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Club code</span>
            <input className={field} value={clubCode} onChange={(e) => setClubCode(e.target.value)} placeholder="BUNS" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">URL slug</span>
            <input
              className={field}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="domi"
            />
            <span className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-soft)]">
              <span className="font-mono">/staff/teams/{suggestedTeamSlug(slug) || "…"}</span>
              <button
                type="button"
                className="text-[var(--coral-ink)]"
                onClick={() => setSlug(suggestedTeamSlug(clubCode))}
              >
                Use club code
              </button>
            </span>
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Motto</span>
            <input className={field} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Optional" />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Color</span>
            <span className="flex items-center gap-3">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--surface-strong)]" />
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
        <p className="text-sm text-[var(--ink-soft)]">
          <span className="font-extrabold text-[var(--ink)]">
            {inputted}/{roster.length || 15}
          </span>{" "}
          players marked inputted
          {roster.length && inputted < roster.length ? ` · ${roster.length - inputted} still open on this team` : roster.length ? " · this team is locked in" : ""}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const done = roster.filter((u) => u.category === cat && u.entered).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTab(cat)}
                  className={`rounded-full px-4 py-1.5 text-sm ${tab === cat ? "bg-[var(--coral)] text-white" : "bg-[var(--surface-2)] text-[var(--ink-soft)]"}`}
                >
                  {CATEGORY_LABEL[cat]} {done}/3
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[var(--ink-soft)]">
            {catalog
              ? `Latest Tazuna · ${catalog.umas.length} umas · ${catalog.skills.length} skills`
              : "Picker loads in the background"}
          </p>
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

      <p className="text-sm text-[var(--ink-soft)]">
        {saveState === "unsaved" ? "Unsaved changes." : status}
      </p>
    </div>
  );
}

function JsonLoad({
  umas,
  skills,
  category,
  style,
  onLoad,
}: {
  umas: CatalogUma[];
  skills: CatalogSkill[];
  category: string;
  style: string | null;
  onLoad: (patch: ImportedUma) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");

  function apply() {
    if (!umas.length || !skills.length) {
      setNote("The uma and skill list is still loading. Try again in a moment.");
      return;
    }
    try {
      const { patch, warnings } = importUmaJson(text, umas, skills, { category, style });
      onLoad(patch);
      setNote(
        warnings.length
          ? warnings.join(" ")
          : `Loaded ${patch.umaName || patch.spriteId || "uma"} · ${patch.skills.length} skills.`,
      );
      if (!warnings.length) setOpen(false);
    } catch {
      setNote("That is not valid JSON.");
    }
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)] underline decoration-[var(--line-strong)] underline-offset-2"
      >
        {open ? "Hide JSON" : "Load JSON"}
      </button>
      {open ? (
        <div className="mt-2 grid gap-2">
          <textarea
            className={`${field} min-h-28 font-mono text-xs`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Paste { "outfitId": "102001", "skills": ["100201"] } or { "card_id": 100103, "skill_array": [{ "skill_id": 200331 }] }'
            spellCheck={false}
          />
          <button type="button" onClick={apply} className="w-fit rounded-full bg-[var(--ink)] px-3 py-1.5 text-sm font-extrabold text-[var(--paper)]">
            Load into this uma
          </button>
        </div>
      ) : null}
      {note ? <p className="mt-2 text-xs text-[var(--ink-soft)]">{note}</p> : null}
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
    <article
      className={`rounded-3xl bg-[var(--surface-strong)] p-4 ring-1 ${uma.entered ? "ring-[var(--mint)]" : "ring-[var(--line)]"}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-[family-name:var(--font-display)] text-xl">
          {uma.trainer.trim() || `Uma ${uma.slot + 1}`}
        </h2>
        <div className="flex items-center gap-3">
          {uma.spriteId ? <span className="font-mono text-xs text-[var(--ink-soft)]">{uma.spriteId}</span> : null}
          <button
            type="button"
            role="switch"
            aria-checked={uma.entered}
            onClick={() => onChange({ entered: !uma.entered })}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-extrabold ${
              uma.entered
                ? "bg-[var(--mint)] text-[var(--paper)]"
                : "bg-[var(--surface-2)] text-[var(--ink-soft)] ring-1 ring-[var(--line)]"
            }`}
          >
            <span
              className={`relative h-5 w-9 rounded-full ${uma.entered ? "bg-black/15" : "bg-[var(--line-strong)]"}`}
              aria-hidden
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--paper)] ${uma.entered ? "left-4" : "left-0.5"}`}
              />
            </span>
            {uma.entered ? "Inputted" : "Not inputted"}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={uma.styleWarn}
            onClick={() => onChange({ styleWarn: !uma.styleWarn })}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-extrabold ${
              uma.styleWarn
                ? "bg-[#d1262d] text-white"
                : "bg-[var(--surface-2)] text-[var(--ink-soft)] ring-1 ring-[var(--line)]"
            }`}
          >
            <span
              className={`relative h-5 w-9 rounded-full ${uma.styleWarn ? "bg-black/15" : "bg-[var(--line-strong)]"}`}
              aria-hidden
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--paper)] ${uma.styleWarn ? "left-4" : "left-0.5"}`}
              />
            </span>
            Style warning
          </button>
        </div>
      </div>
      <fieldset disabled={uma.entered} className="min-w-0 border-0 p-0 disabled:opacity-60">
      <JsonLoad
        umas={umas}
        skills={skills}
        category={uma.category}
        style={uma.style}
        onLoad={(patch) => onChange(patch)}
      />
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
          <div className="grid grid-cols-3 gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Rating</span>
              <input className={field} value={uma.rating ?? ""} onChange={(e) => onChange({ rating: e.target.value })} placeholder="UG" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Score</span>
              <input className={field} value={uma.score ?? ""} onChange={(e) => onChange({ score: e.target.value })} />
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
      </fieldset>
    </article>
  );
}
