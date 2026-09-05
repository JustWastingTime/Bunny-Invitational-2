"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/constants";
import { GroupTable } from "@/components/tournament-ui";
import { usePublicData } from "@/components/use-public-data";
import type { PublicMatch, PublicPayload } from "@/lib/types";

export default function ScoresPage() {
  const { data, error } = usePublicData(2500);
  const [matchId, setMatchId] = useState<string>("");
  const [category, setCategory] = useState<string>("sprint");
  const [places, setPlaces] = useState<Record<number, string>>({});
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<{
    groups: PublicPayload["groups"];
    playIn: PublicPayload["playIn"];
  } | null>(null);

  const match: PublicMatch | undefined = useMemo(() => {
    if (!data) return undefined;
    return data.matches.find((m) => m.id === (matchId || data.now?.matchId || data.matches[0]?.id));
  }, [data, matchId]);

  const racers = useMemo(() => {
    if (!data || !match) return [];
    const out: { key: string; teamId: string; slot: number; label: string; color: string }[] = [];
    for (const t of match.teams) {
      if (!t.teamId) continue;
      const team = data.teams.find((x) => x.id === t.teamId);
      for (let slot = 0; slot < 3; slot++) {
        const uma = team?.roster.find((u) => u.category === category && u.slot === slot);
        out.push({
          key: `${t.teamId}:${slot}`,
          teamId: t.teamId,
          slot,
          color: t.color,
          label: `${t.name} · ${uma?.umaName ?? `slot ${slot + 1}`} (${uma?.trainer || "—"})`,
        });
      }
    }
    return out;
  }, [data, match, category]);

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
    if (!match) return;
    setStatus("Saving…");
    const placements = Object.entries(places)
      .map(([place, key]) => {
        const [teamId, slot] = key.split(":");
        return { place: Number(place), teamId, slot: Number(slot) };
      })
      .filter((p) => p.teamId);
    const res = await fetch("/api/staff/placements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id, category, placements }),
    });
    const json = await res.json();
    if (res.ok) {
      setStatus("Saved. Points and qualification updated.");
      setPreview({ groups: json.groups ?? [], playIn: json.playIn });
    } else setStatus(json.error ?? "Failed");
  }

  if (!data) return <p>{error ?? "Loading scores desk…"}</p>;
  const current = match ?? data.matches[0];
  const existing = current?.races.find((r) => r.category === category);

  return (
    <div className="grid gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Score entry</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Match
          <select
            className="rounded-2xl border border-[var(--line)] bg-white px-3 py-2"
            value={current?.id ?? ""}
            onChange={(e) => {
              setMatchId(e.target.value);
              setPlaces({});
            }}
          >
            {data.matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Race
          <select
            className="rounded-2xl border border-[var(--line)] bg-white px-3 py-2"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPlaces({});
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {current ? (
        <div className="grid gap-3 md:grid-cols-3">
          {current.teams.map((t) => (
            <div key={t.slot} className="rounded-2xl bg-white p-3 ring-1 ring-[var(--line)]">
              <p className="font-semibold">{t.name}</p>
              <p className="text-sm text-[var(--ink-soft)]">Match pts: {t.points}</p>
            </div>
          ))}
        </div>
      ) : null}

      <section className="rounded-3xl border border-[var(--line)] bg-white p-4">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl">Places 1–5</h2>
        <div className="grid gap-2">
          {[1, 2, 3, 4, 5].map((place) => (
            <label key={place} className="grid grid-cols-[3rem_1fr] items-center gap-2 text-sm">
              <span className="font-semibold">{place}</span>
              <select
                className="rounded-2xl border border-[var(--line)] px-2 py-2"
                value={places[place] ?? existingKey(existing?.placements.find((p) => p.place === place))}
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
        {existing?.placements.length ? (
          <ul className="mt-4 grid gap-1 text-sm text-[var(--ink-soft)]">
            {existing.placements
              .filter((p) => p.place <= 5)
              .map((p) => (
                <li key={p.place}>
                  {p.place}. {p.umaName} → {p.net} pts
                  {p.penalty ? ` (${p.penalty} pop)` : ""}
                  {p.uniqueBonus ? ` (+${p.uniqueBonus} unique)` : ""}
                </li>
              ))}
            {existing.placements
              .filter((p) => p.place > 5 && p.penalty)
              .map((p) => (
                <li key={`out-${p.teamId}-${p.slot}`}>
                  Outside top 5 · {p.umaName} → {p.net} pts ({p.penalty} pop)
                </li>
              ))}
          </ul>
        ) : null}
        <button type="button" onClick={save} className="mt-4 rounded-full bg-[var(--coral)] px-4 py-2 text-white">
          Save race
        </button>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">{status}</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {(preview?.groups ?? data.groups).map((g) => (
          <GroupTable key={g.id} group={g.id} standings={g.standings} />
        ))}
      </div>
      {(preview?.playIn ?? data.playIn)?.standings?.length ? (
        <GroupTable group="Play-in" standings={(preview?.playIn ?? data.playIn).standings} />
      ) : null}
    </div>
  );
}

function existingKey(p?: { teamId: string; slot: number }) {
  return p ? `${p.teamId}:${p.slot}` : "";
}
