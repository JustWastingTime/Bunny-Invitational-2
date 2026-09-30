"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/constants";
import { DataError, Loading, PageTitle } from "@/components/site-chrome";
import type { PublicTeam, PublicUma } from "@/lib/types";

type PlayInPayload = {
  updatedAt: string;
  teams: PublicTeam[];
};

export default function PlayInRostersPage() {
  const { data, error } = usePlayInRosters();

  if (!data) return error ? <DataError what="play-in field" /> : <Loading what="play-in field" />;

  return (
    <div>
      <PageTitle kicker="Second clubs" title="Play-in umas">
        Seven play-in clubs. Their umas are up here while the main field is still locking in. Oshi and popularity on
        this page count only inside the play-in.
      </PageTitle>

      {data.teams.length === 0 ? (
        <p className="rounded-2xl bg-[var(--surface)] px-5 py-4 text-[var(--ink-soft)]">No play-in teams yet.</p>
      ) : (
        <>
          <nav aria-label="Play-in teams" className="mb-10 flex flex-wrap gap-2">
            {data.teams.map((team) => (
              <a
                key={team.id}
                href={`#${team.id}`}
                className="inline-flex items-center gap-2 bg-[var(--surface)] px-3 py-2 text-sm ring-1 ring-[var(--line)] hover:bg-[var(--surface-2)]"
              >
                <span className="h-3 w-3" style={{ background: team.color }} />
                <span className="font-extrabold">{team.shortName || team.name}</span>
              </a>
            ))}
          </nav>

          <div className="grid gap-14">
            {data.teams.map((team) => (
              <TeamRoster key={team.id} team={team} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TeamRoster({ team }: { team: PublicTeam }) {
  return (
    <section id={team.id} className="scroll-mt-24">
      <header className="mb-5 flex items-end gap-3 border-b border-[var(--line)] pb-3">
        <span className="h-8 w-8 shrink-0" style={{ background: team.color }} />
        <div>
          <h2 className="display-lg text-3xl leading-none">{team.name}</h2>
          {team.tagline ? <p className="mt-1 text-sm text-[var(--ink-soft)]">{team.tagline}</p> : null}
        </div>
      </header>

      <div className="grid gap-8">
        {CATEGORIES.map((cat) => (
          <div key={cat}>
            <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl">{CATEGORY_LABEL[cat]}</h3>
            <div className="grid gap-4 lg:grid-cols-3">
              {team.roster
                .filter((uma) => uma.category === cat)
                .sort((a, b) => a.slot - b.slot)
                .map((uma) => (
                  <UmaCard key={`${uma.category}-${uma.slot}`} uma={uma} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UmaCard({ uma }: { uma: PublicUma }) {
  const filled = uma.umaName && uma.umaName !== "TBD";
  return (
    <article className={`rounded-2xl bg-[var(--surface)] p-3 ${filled ? "" : "opacity-70"}`}>
      <div className="flex gap-3">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--paper-2)]">
          {uma.spritePath ? (
            <Image src={uma.spritePath} alt={uma.umaName} width={96} height={96} className="h-24 w-24 object-contain" />
          ) : (
            <span className="text-xs text-[var(--ink-soft)]">no art</span>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="font-[family-name:var(--font-display)] text-xl leading-tight">{uma.umaName}</h4>
          <p className="text-sm text-[var(--ink-soft)]">
            {uma.trainer || "Trainer TBD"} · {uma.rating ?? "—"} · {uma.styleLabel ?? "—"}
          </p>
          <p className="mt-1 text-xs">
            {uma.spriteId && uma.isUnique ? <span className="mr-2 font-semibold text-[var(--mint)]">Unique</span> : null}
            {uma.popularityRank && uma.popularityRank <= 3 && uma.pickCount > 1 ? (
              <span className="mr-2 font-semibold">Popular #{uma.popularityRank}</span>
            ) : null}
            Apt {uma.aptitudes.terrain ?? "—"}/{uma.aptitudes.distance ?? "—"}/{uma.aptitudes.style ?? "—"}
          </p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-5 gap-px bg-[var(--line)] text-center text-xs">
        {Object.entries(uma.stats).map(([key, value]) => (
          <div key={key} className="bg-[var(--paper)] py-1">
            <dt className="uppercase text-[var(--ink-soft)]">{key.slice(0, 3)}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {uma.skills.length ? <p className="mt-2 text-xs text-[var(--ink-soft)]">{uma.skills.join(" · ")}</p> : null}
    </article>
  );
}

function usePlayInRosters() {
  const [data, setData] = useState<PlayInPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function tick() {
      try {
        const res = await fetch("/api/play-in", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load");
        const json = (await res.json()) as PlayInPayload;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      }
    }

    function stop() {
      if (timer === undefined) return;
      clearInterval(timer);
      timer = undefined;
    }

    function start() {
      if (timer !== undefined) return;
      timer = setInterval(tick, 15000);
    }

    function onVisibility() {
      if (document.hidden) {
        stop();
        return;
      }
      void tick();
      start();
    }

    void tick();
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { data, error };
}
