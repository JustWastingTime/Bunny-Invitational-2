"use client";

import Link from "next/link";
import { NowNext } from "@/components/now-next";
import { GroupTable } from "@/components/tournament-ui";
import { MapsGrid } from "@/components/race-maps";
import { DataError, Loading } from "@/components/site-chrome";
import { usePublicData } from "@/components/use-public-data";
import { PUBLIC_GROUPS_LIVE, PUBLIC_TOURNAMENT_LIVE } from "@/lib/constants";

export default function HomePage() {
  const { data, error } = usePublicData();

  return (
    <div className="grid gap-10">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)] lg:items-end">
        <div>
          <p className="kicker">Uma Musume invitational</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl leading-[0.95] lg:text-7xl">
            Bunny
            <br />
            Invitational 2
          </h1>
        </div>
        <div>
          <p className="text-[var(--ink-soft)]">
            21 main stage teams, 7 play in teams. 3v3v3 across Sprint, Mile, Medium, Long, and Dirt.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/scoreboard"
              className="rounded-full bg-[var(--accent-solid)] px-5 py-2 text-sm font-semibold text-[var(--accent-on-solid)]"
            >
              {PUBLIC_TOURNAMENT_LIVE ? "Live scoreboard" : "Scoreboard"}
            </Link>
            <Link href="/schedule" className="rounded-full bg-[var(--surface-2)] px-5 py-2 text-sm">
              Order of play
            </Link>
          </div>
        </div>
      </section>

      {error && !data ? <DataError what="board" /> : null}
      {data ? <NowNext now={data.now} next={data.next} /> : error ? null : <Loading what="board" />}

      {data && PUBLIC_GROUPS_LIVE ? (
        <section>
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-3xl">Group tables</h2>
            <Link href="/scoreboard" className="text-sm text-[var(--coral-ink)]">
              Full scoreboard →
            </Link>
          </div>
          <div className="grid gap-10 xl:grid-cols-3">
            {data.groups.map((g) => (
              <GroupTable key={g.id} group={g.id} standings={g.standings} />
            ))}
          </div>
        </section>
      ) : (
        <section id="maps">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-3xl">Maps</h2>
          </div>
          <MapsGrid compact />
        </section>
      )}
    </div>
  );
}
