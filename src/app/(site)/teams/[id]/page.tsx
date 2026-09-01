"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useMemo } from "react";
import { CATEGORY_LABEL, CATEGORIES } from "@/lib/constants";
import { usePublicData } from "@/components/use-public-data";

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data } = usePublicData(15000);
  const team = data?.teams.find((t) => t.id === id);

  const records = useMemo(() => {
    const map = new Map<string, { starts: number; wins: number; top5: number }>();
    if (!data) return map;
    for (const match of data.matches) {
      for (const race of match.races) {
        for (const p of race.placements) {
          if (p.teamId !== id) continue;
          const key = `${race.category}:${p.slot}`;
          const cur = map.get(key) ?? { starts: 0, wins: 0, top5: 0 };
          cur.starts += 1;
          if (p.place === 1) cur.wins += 1;
          if (p.place <= 5) cur.top5 += 1;
          map.set(key, cur);
        }
      }
    }
    return map;
  }, [data, id]);

  if (!data) return <p>Loading team…</p>;
  if (!team) return <p>Team not found.</p>;

  return (
    <div className="grid gap-8">
      <Link href="/teams" className="text-sm text-[var(--coral-ink)]">
        ← All teams
      </Link>
      <header className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-4">
        <span className="h-10 w-10 rounded-full" style={{ background: team.color }} />
        <div>
          <p className="kicker">Group {team.group}</p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-none">{team.name}</h1>
          {team.tagline ? <p className="mt-1 text-[var(--ink-soft)]">{team.tagline}</p> : null}
        </div>
      </header>

      {CATEGORIES.map((cat) => (
        <section key={cat}>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">{CATEGORY_LABEL[cat]}</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {team.roster
              .filter((u) => u.category === cat)
              .sort((a, b) => a.slot - b.slot)
              .map((u) => {
                const rec = records.get(`${u.category}:${u.slot}`) ?? { starts: 0, wins: 0, top5: 0 };
                const winRate = rec.starts ? Math.round((rec.wins / rec.starts) * 100) : 0;
                return (
                  <article key={`${u.category}-${u.slot}`} className="rounded-2xl bg-white/55 p-3">
                    <div className="flex gap-3">
                      <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--paper-2)]">
                        {u.spritePath ? (
                          <Image src={u.spritePath} alt={u.umaName} width={96} height={96} className="h-24 w-24 object-contain" />
                        ) : (
                          <span className="text-xs text-[var(--ink-soft)]">no art</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-[family-name:var(--font-display)] text-xl leading-tight">{u.umaName}</h3>
                        <p className="text-sm text-[var(--ink-soft)]">
                          {u.trainer} · {u.rating ?? "—"} · {u.styleLabel ?? "—"}
                        </p>
                        <p className="mt-1 text-xs">
                          {u.isUnique ? <span className="mr-2 font-semibold text-[var(--mint)]">Unique</span> : null}
                          {u.popularityRank && u.popularityRank <= 3 && u.pickCount > 1 ? (
                            <span className="mr-2 font-semibold">Popular #{u.popularityRank}</span>
                          ) : null}
                          Apt {u.aptitudes.terrain ?? "—"}/{u.aptitudes.distance ?? "—"}/{u.aptitudes.style ?? "—"} · Win {winRate}%
                        </p>
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-5 gap-px bg-[var(--line)] text-center text-xs">
                      {Object.entries(u.stats).map(([k, v]) => (
                        <div key={k} className="bg-[var(--paper)] py-1">
                          <dt className="uppercase text-[var(--ink-soft)]">{k.slice(0, 3)}</dt>
                          <dd className="font-semibold">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    {u.skills.length ? (
                      <p className="mt-2 text-xs text-[var(--ink-soft)]">{u.skills.join(" · ")}</p>
                    ) : null}
                  </article>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
