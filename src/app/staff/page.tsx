import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TEAM_KIND_PLAYIN } from "@/lib/constants";
import { ensurePlayInTeams } from "@/lib/play-in";

function chunk<T>(rows: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function TeamCard({
  team,
}: {
  team: { id: string; name: string; shortName: string | null; tagline: string | null; color: string };
}) {
  return (
    <Link
      href={`/staff/teams/${team.id}`}
      className="flex overflow-hidden rounded-2xl bg-white ring-1 ring-[var(--line)] transition hover:-translate-y-0.5 hover:shadow-sm"
    >
      <span className="w-2 shrink-0" style={{ background: team.color }} />
      <span className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3">
        <span className="min-w-0">
          <span className="block font-[family-name:var(--font-display)] text-xl leading-tight">
            {team.shortName || team.name}
          </span>
          {team.tagline ? <span className="mt-0.5 block truncate text-sm text-[var(--ink-soft)]">{team.tagline}</span> : null}
        </span>
        <span className="shrink-0 text-sm text-[var(--coral-ink)]">Edit</span>
      </span>
    </Link>
  );
}

export default async function StaffHome() {
  await ensurePlayInTeams();
  const teams = await prisma.team.findMany({ orderBy: [{ name: "asc" }] });
  const main = teams.filter((t) => t.kind !== TEAM_KIND_PLAYIN);
  const playIn = teams
    .filter((t) => t.kind === TEAM_KIND_PLAYIN)
    .sort((a, b) => a.id.localeCompare(b.id));
  const columns = chunk(main, Math.ceil(main.length / 3) || 1);

  return (
    <div className="grid gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Tournament desk</h1>
      <p className="text-[var(--ink-soft)]">
        Update rosters here. Assign groups on the Groups page. The public site and OBS overlay poll automatically.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/staff/groups" className="rounded-3xl border border-[var(--line)] bg-white p-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Groups</h2>
          <p className="text-sm text-[var(--ink-soft)]">Drag 21 teams into A/B/C and regenerate matchups.</p>
        </Link>
        <Link href="/staff/scores" className="rounded-3xl border border-[var(--line)] bg-white p-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Scores</h2>
          <p className="text-sm text-[var(--ink-soft)]">Enter 1st–5th. Points and advancement update immediately.</p>
        </Link>
        <Link href="/staff/overlay" className="rounded-3xl border border-[var(--line)] bg-white p-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Overlay director</h2>
          <p className="text-sm text-[var(--ink-soft)]">Pick the live match and flip matchup / scoreboard for OBS.</p>
        </Link>
      </div>
      <section>
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl">Main rosters</h2>
        <p className="mb-4 text-sm text-[var(--ink-soft)]">
          Club code, color, motto, and umas. Group placement is on Groups — these columns are just layout.
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          {columns.map((col, i) => (
            <ul key={i} className="grid gap-3 content-start">
              {col.map((t) => (
                <li key={t.id}>
                  <TeamCard team={t} />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl">Play-in teams</h2>
        <p className="mb-4 text-sm text-[var(--ink-soft)]">
          Second-club entries. Their umas do not count toward the main field’s oshi / popularity — they have their own
          counter. Teams that make it through can remake for the main stage.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {playIn.map((t) => (
            <li key={t.id}>
              <TeamCard team={t} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
