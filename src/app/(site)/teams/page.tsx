"use client";

import Link from "next/link";
import { PageTitle } from "@/components/site-chrome";
import { usePublicData } from "@/components/use-public-data";
import type { PublicTeam } from "@/lib/types";

export default function TeamsPage() {
  const { data } = usePublicData(15000);
  if (!data) return <p>Loading teams…</p>;

  const grouped = ["A", "B", "C"].map((g) => ({
    g,
    teams: data.teams.filter((t) => t.kind !== "playin" && t.group === g),
  }));
  const playIn = data.teams.filter((t) => t.kind === "playin");

  return (
    <div>
      <PageTitle kicker="The field" title="Teams">
        21 clubs plus seven play-ins. Open a team for stats, skills, and in-tournament form.
      </PageTitle>
      <div className="grid gap-10 xl:grid-cols-3">
        {grouped.map(({ g, teams }) => (
          <section key={g}>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Group {g}</h2>
            <ul className="grid gap-3">
              {teams.map((team) => (
                <li key={team.id}>
                  <TeamBox team={team} showTagline />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {playIn.length ? (
        <section className="mt-10">
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-2xl">Play-in</h2>
          <p className="mb-3 text-sm text-[var(--ink-soft)]">
            Second-club teams. Their oshi and popularity counts are separate from the main field.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {playIn.map((team) => (
              <li key={team.id}>
                <TeamBox team={team} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function TeamBox({ team, showTagline = false }: { team: PublicTeam; showTagline?: boolean }) {
  return (
    <Link
      href={`/teams/${team.id}`}
      className="flex overflow-hidden rounded-2xl bg-white/55 ring-1 ring-[var(--line)] transition hover:bg-white/80"
    >
      <span className="w-2 shrink-0" style={{ background: team.color }} />
      <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3 px-3 py-3">
        <span className="font-[family-name:var(--font-display)] text-lg leading-tight">{team.name}</span>
        {showTagline && team.tagline ? (
          <span className="truncate text-sm text-[var(--ink-soft)]">{team.tagline}</span>
        ) : null}
      </span>
    </Link>
  );
}
