"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { CATEGORY_LABEL, CATEGORIES, PUBLIC_FIELD_LIVE, PUBLIC_TOURNAMENT_LIVE } from "@/lib/constants";
import { ComingSoon, DataError, Loading } from "@/components/site-chrome";
import { UmaRosterCard } from "@/components/uma-roster-card";
import { usePublicData } from "@/components/use-public-data";
import { addFinish, emptyFinish } from "@/lib/uma-finish";

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = usePublicData(15000);
  const skillRarity = useSkillRarity(PUBLIC_FIELD_LIVE || PUBLIC_TOURNAMENT_LIVE);

  const finishes = useMemo(() => {
    const map = new Map<string, ReturnType<typeof emptyFinish>>();
    if (!data) return map;
    for (const match of data.matches) {
      for (const race of match.races) {
        for (const placement of race.placements) {
          if (placement.teamId !== id) continue;
          const key = `${race.category}:${placement.slot}`;
          const record = map.get(key) ?? emptyFinish();
          addFinish(record, placement.place, placement.net);
          map.set(key, record);
        }
      }
    }
    return map;
  }, [data, id]);

  if (!PUBLIC_FIELD_LIVE && !PUBLIC_TOURNAMENT_LIVE) {
    return (
      <ComingSoon kicker="The field" title="Teams">
        Club rosters publish after uma submissions lock.
      </ComingSoon>
    );
  }
  if (!data) return error ? <DataError what="team" /> : <Loading what="team" />;
  const team = data.teams.find((row) => row.id === id);
  if (!team)
    return (
      <div className="rounded-2xl bg-[var(--surface)] px-5 py-4">
        <p className="font-semibold text-[var(--ink)]">That team isn’t in the field.</p>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">The link may be out of date since the draw changed.</p>
        <Link href="/teams" className="mt-3 inline-block font-semibold text-[var(--coral-ink)] underline">
          Browse all teams
        </Link>
      </div>
    );
  if (team.kind === "playin" && !PUBLIC_TOURNAMENT_LIVE) {
    return (
      <div className="rounded-2xl bg-[var(--surface)] px-5 py-4">
        <p className="font-semibold text-[var(--ink)]">{team.name} is in the play-in.</p>
        <Link href={`/play-in#${team.id}`} className="mt-3 inline-block font-semibold text-[var(--coral-ink)] underline">
          Open their play-in cards
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <Link href="/teams" className="text-sm text-[var(--coral-ink)]">
        ← All teams
      </Link>
      <header className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-4">
        <span className="h-10 w-10 rounded-full" style={{ background: team.color }} />
        <div>
          <p className="kicker">{team.kind === "playin" ? "Play-in" : `Group ${team.group}`}</p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-none">{team.name}</h1>
          {team.tagline ? <p className="mt-1 text-[var(--ink-soft)]">{team.tagline}</p> : null}
        </div>
      </header>

      {CATEGORIES.map((cat) => (
        <section key={cat}>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">{CATEGORY_LABEL[cat]}</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {team.roster
              .filter((uma) => uma.category === cat)
              .sort((a, b) => a.slot - b.slot)
              .map((uma) => (
                <UmaRosterCard
                  key={`${uma.category}-${uma.slot}`}
                  uma={uma}
                  finish={finishes.get(`${uma.category}:${uma.slot}`)}
                  skillRarity={skillRarity}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function useSkillRarity(enabled: boolean) {
  const [rarity, setRarity] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/skill-rarity", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("skills");
        return res.json() as Promise<{ rarity?: Record<string, string> }>;
      })
      .then((json) => {
        if (!cancelled) setRarity(json.rarity ?? {});
      })
      .catch(() => {
        /* white chips, first skill still rainbow */
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return rarity;
}
