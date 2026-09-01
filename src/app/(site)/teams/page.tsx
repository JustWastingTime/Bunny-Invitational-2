"use client";

import Link from "next/link";
import { PageTitle } from "@/components/site-chrome";
import { usePublicData } from "@/components/use-public-data";

export default function TeamsPage() {
  const { data } = usePublicData(15000);
  if (!data) return <p>Loading teams…</p>;

  const grouped = ["A", "B", "C"].map((g) => ({
    g,
    teams: data.teams.filter((t) => t.kind !== "playin" && t.group === g),
  }));

  return (
    <div>
      <PageTitle kicker="The field" title="Teams">
        21 clubs plus play-ins. Open a team for stats, skills, and in-tournament form.
      </PageTitle>
      <div className="grid gap-10 xl:grid-cols-3">
        {grouped.map(({ g, teams }) => (
          <section key={g}>
            <h2 className="mb-2 font-[family-name:var(--font-display)] text-2xl">Group {g}</h2>
            <ul>
              {teams.map((team) => (
                <li key={team.id}>
                  <Link
                    href={`/teams/${team.id}`}
                    className="flex items-baseline justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-white/60"
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: team.color }} />
                      <span className="font-[family-name:var(--font-display)] text-lg">{team.name}</span>
                    </span>
                    {team.tagline ? <span className="truncate text-sm text-[var(--ink-soft)]">{team.tagline}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {data.teams.some((t) => t.kind === "playin") ? (
        <section className="mt-10">
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-2xl">Play-in</h2>
          <p className="mb-3 text-sm text-[var(--ink-soft)]">
            Second-club teams. Their oshi and popularity counts are separate from the main field.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {data.teams
              .filter((t) => t.kind === "playin")
              .map((team) => (
                <li key={team.id}>
                  <Link href={`/teams/${team.id}`} className="flex items-center gap-2 rounded-xl px-2 py-2.5 hover:bg-white/60">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: team.color }} />
                    <span className="font-[family-name:var(--font-display)] text-lg">{team.name}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
