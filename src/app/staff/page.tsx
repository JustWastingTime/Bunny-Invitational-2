import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, TEAM_KIND_PLAYIN } from "@/lib/constants";
import { StaffSyncSlugs } from "@/components/staff-sync-slugs";

const ROSTER_SIZE = CATEGORIES.length * 3;

type DeskTeam = {
  id: string;
  name: string;
  shortName: string | null;
  tagline: string | null;
  color: string;
  umaEntries: { entered: boolean }[];
};

function enteredCount(team: DeskTeam) {
  return team.umaEntries.filter((entry) => entry.entered).length;
}

function isLocked(team: DeskTeam) {
  return enteredCount(team) >= ROSTER_SIZE;
}

function chunk<T>(rows: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function TeamCard({ team }: { team: DeskTeam }) {
  const done = enteredCount(team);
  const locked = done >= ROSTER_SIZE;
  return (
    <Link
      href={`/staff/teams/${team.id}`}
      className="flex overflow-hidden rounded-2xl bg-[var(--surface-strong)] ring-1 ring-[var(--line)] transition hover:-translate-y-0.5 hover:shadow-sm"
    >
      <span className="w-2 shrink-0" style={{ background: team.color }} />
      <span className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3">
        <span className="min-w-0">
          <span className="block font-[family-name:var(--font-display)] text-xl leading-tight">
            {team.shortName || team.name}
          </span>
          {team.tagline ? <span className="mt-0.5 block truncate text-sm text-[var(--ink-soft)]">{team.tagline}</span> : null}
        </span>
        <span
          className={`shrink-0 text-sm font-extrabold ${locked ? "text-[var(--mint)]" : "text-[var(--coral-ink)]"}`}
        >
          {locked ? "Locked" : `${done}/${ROSTER_SIZE}`}
        </span>
      </span>
    </Link>
  );
}

function OpenLockIns({ title, teams }: { title: string; teams: DeskTeam[] }) {
  const open = [...teams].filter((team) => !isLocked(team)).sort((a, b) => enteredCount(a) - enteredCount(b));
  return (
    <div>
      <h3 className="font-[family-name:var(--font-display)] text-lg">{title}</h3>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">
        {teams.length === 0
          ? "No teams yet."
          : open.length === 0
            ? `All ${teams.length} locked in.`
            : `${open.length} of ${teams.length} still locking in.`}
      </p>
      {open.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {open.map((team) => (
            <li key={team.id}>
              <Link
                href={`/staff/teams/${team.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--paper)] px-3 py-1.5 text-sm ring-1 ring-[var(--line)]"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: team.color }} />
                <span className="font-extrabold">{team.shortName || team.name}</span>
                <span className="font-mono text-[var(--ink-soft)]">
                  {enteredCount(team)}/{ROSTER_SIZE}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default async function StaffHome() {
  const teams = await prisma.team.findMany({
    orderBy: [{ name: "asc" }],
    include: { umaEntries: { select: { entered: true } } },
  });
  const main = teams.filter((t) => t.kind !== TEAM_KIND_PLAYIN);
  const playIn = teams
    .filter((t) => t.kind === TEAM_KIND_PLAYIN)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const stillOpen = teams.filter((t) => !isLocked(t)).length;
  const columns = chunk(main, Math.ceil(main.length / 3) || 1);

  return (
    <div className="grid gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Tournament desk</h1>
      <p className="text-[var(--ink-soft)]">
        Update rosters here. Assign groups on the Groups page. The public site and OBS overlay poll automatically.
      </p>
      <section className="rounded-3xl bg-[var(--surface-strong)] p-4 ring-1 ring-[var(--line)]">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">
          {stillOpen === 0
            ? "Every team is locked in"
            : `${stillOpen} ${stillOpen === 1 ? "team isn't" : "teams aren't"} fully locked in`}
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          A team locks in when all {ROSTER_SIZE} players are marked inputted on their roster.
        </p>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <OpenLockIns title="Main" teams={main} />
          <OpenLockIns title="Play-in" teams={playIn} />
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/staff/groups" className="rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Groups</h2>
          <p className="text-sm text-[var(--ink-soft)]">Drag 21 teams into A/B/C and regenerate matchups.</p>
        </Link>
        <Link href="/staff/scores" className="rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Standings</h2>
          <p className="text-sm text-[var(--ink-soft)]">
            Read-only tables. Race results are entered on the Overlay director.
          </p>
        </Link>
        <Link href="/staff/overlay" className="rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Overlay director</h2>
          <p className="text-sm text-[var(--ink-soft)]">
            Stage the match, set gates, enter the 1st–5th result, and flip the OBS view.
          </p>
        </Link>
      </div>
      <section>
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl">Main rosters</h2>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--ink-soft)]">
            Club code, color, motto, and umas. The URL slug is separate — change it on each team, or sync every URL
            from the club code (DOMI → /staff/teams/domi).
          </p>
          <StaffSyncSlugs />
        </div>
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
