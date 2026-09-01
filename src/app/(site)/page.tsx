"use client";

import Link from "next/link";
import { NowNext } from "@/components/now-next";
import { GroupTable } from "@/components/tournament-ui";
import { usePublicData } from "@/components/use-public-data";

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
            21 teams, three groups of seven. 3v3v3 across Sprint, Mile, Medium, Long, and Dirt — then quarters, semis, and a two-set Grand Final.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/scoreboard" className="rounded-full bg-[var(--coral)] px-5 py-2 text-sm font-semibold text-white">
              Live scoreboard
            </Link>
            <Link href="/schedule" className="rounded-full bg-white/80 px-5 py-2 text-sm">
              Order of play
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="text-[var(--coral-ink)]">{error}. Try running the database seed.</p> : null}
      {data ? <NowNext now={data.now} next={data.next} /> : <p className="text-[var(--ink-soft)]">Loading the board…</p>}

      {data ? (
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
      ) : null}
    </div>
  );
}
