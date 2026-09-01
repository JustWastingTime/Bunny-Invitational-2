"use client";

import { useState } from "react";
import type { GroupStandingRow, PublicMatch, PublicPayload } from "@/lib/types";

export function GroupTable({
  group,
  standings,
}: {
  group: string;
  standings: GroupStandingRow[];
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="font-[family-name:var(--font-display)] text-2xl">Group {group}</h3>
        <p className="text-xs text-[var(--ink-soft)]">Top 2 Semis · 3–5 LCQ</p>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white/50">
        <table className="ink-table min-w-[22rem]">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th className="text-right">Pts</th>
              <th className="text-right">W</th>
              <th className="text-right">1st</th>
              <th className="text-right">GP</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr
                key={row.teamId}
                className={row.rank <= 2 ? "qualify" : row.rank <= 5 ? "playoff" : ""}
              >
                <td className="font-semibold">{row.rank}</td>
                <td>
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                  {row.name}
                </td>
                <td className="text-right font-semibold">{row.points}</td>
                <td className="text-right">{row.wins}</td>
                <td className="text-right">{row.firsts}</td>
                <td className="text-right">{row.matchesPlayed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function MatchCard({ match, highlight }: { match: PublicMatch; highlight?: boolean }) {
  return (
    <article className={`rounded-2xl px-4 py-3 ${highlight ? "bg-[var(--gold)]/40" : "bg-white/55"}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="font-[family-name:var(--font-display)] text-base leading-tight">{match.label}</h3>
        {highlight ? <span className="text-[0.65rem] font-extrabold uppercase tracking-wide text-[var(--coral-ink)]">Now</span> : null}
      </div>
      <MatchTeams match={match} />
    </article>
  );
}

function matchNumber(match: PublicMatch) {
  const found = match.label.match(/Match (\d+)/i);
  return found ? found[1] : String(match.sortOrder);
}

function MatchTeams({ match }: { match: PublicMatch }) {
  const showScores = match.complete || match.teams.some((team) => team.points !== 0);
  return (
    <ul className="space-y-1">
      {match.teams.map((team) => (
        <li key={`${match.id}-${team.slot}`} className="flex items-center justify-between text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: team.color }} />
            <span className="truncate">{team.name}</span>
          </span>
          {showScores ? <strong className="ml-2 tabular-nums">{team.points}</strong> : null}
        </li>
      ))}
    </ul>
  );
}

function CompactMatch({ match, highlight }: { match: PublicMatch; highlight?: boolean }) {
  return (
    <article className={`rounded-xl px-3 py-2.5 ${highlight ? "bg-[var(--gold)]/40" : "bg-white/55"}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">
          Match {matchNumber(match)}
        </h4>
        {highlight ? (
          <span className="text-[0.65rem] font-extrabold uppercase tracking-wide text-[var(--coral-ink)]">Now</span>
        ) : null}
      </div>
      <MatchTeams match={match} />
    </article>
  );
}

const GROUPS = ["A", "B", "C"] as const;

export function GroupSchedule({
  matches,
  nowId,
}: {
  matches: PublicMatch[];
  nowId?: string | null;
}) {
  const liveGroup = matches.find((m) => m.id === nowId)?.group;
  const [focus, setFocus] = useState<(typeof GROUPS)[number]>(
    liveGroup === "A" || liveGroup === "B" || liveGroup === "C" ? liveGroup : "A",
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2 lg:hidden">
        {GROUPS.map((group) => (
          <button
            key={group}
            type="button"
            onClick={() => setFocus(group)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              focus === group ? "bg-[var(--coral)] text-white" : "bg-white/70 text-[var(--ink-soft)]"
            }`}
          >
            Group {group}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {GROUPS.map((group) => {
          const groupMatches = matches
            .filter((m) => m.group === group)
            .sort((a, b) => a.sortOrder - b.sortOrder);
          const day1 = groupMatches.filter((m) => m.day === 1);
          const day2 = groupMatches.filter((m) => m.day === 2);
          return (
            <section
              key={group}
              className={focus === group ? "block" : "hidden lg:block"}
            >
              <h3 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Group {group}</h3>
              <DayColumn label="Day 1" matches={day1} nowId={nowId} />
              <DayColumn label="Day 2" matches={day2} nowId={nowId} className="mt-5" />
            </section>
          );
        })}
      </div>
    </div>
  );
}

function DayColumn({
  label,
  matches,
  nowId,
  className = "",
}: {
  label: string;
  matches: PublicMatch[];
  nowId?: string | null;
  className?: string;
}) {
  if (!matches.length) return null;
  return (
    <div className={className}>
      <p className="kicker mb-2">{label}</p>
      <div className="grid gap-2">
        {matches.map((match) => (
          <CompactMatch key={match.id} match={match} highlight={match.id === nowId} />
        ))}
      </div>
    </div>
  );
}

export function ScorerList({ match }: { match: PublicMatch }) {
  const scorers = match.races.flatMap((race) =>
    race.placements
      .filter((p) => p.net !== 0)
      .map((p) => ({ ...p, race: race.label })),
  );
  if (!scorers.length) return <p className="text-sm text-[var(--ink-soft)]">No points recorded yet.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl bg-white/50">
      <table className="ink-table">
        <thead>
          <tr>
            <th>Place</th>
            <th>Uma</th>
            <th>Team</th>
            <th>Race</th>
            <th className="text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {scorers.map((p) => (
            <tr key={`${match.id}-${p.race}-${p.place}-${p.teamId}-${p.slot}`}>
              <td>{p.place}</td>
              <td>
                {p.umaName}{" "}
                <span className="text-[var(--ink-soft)]">({p.trainer})</span>
              </td>
              <td>{p.teamName}</td>
              <td>
                {p.race}
                {p.penalty ? ` · pop ${p.penalty}` : ""}
                {p.uniqueBonus ? ` · unique +${p.uniqueBonus}` : ""}
              </td>
              <td className="text-right font-semibold text-[var(--coral-ink)]">
                {p.net > 0 ? `+${p.net}` : p.net}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function KnockoutBoard({ data }: { data: PublicPayload }) {
  const qf = data.matches.filter((m) => m.stage === "qf");
  const semis = data.matches.filter((m) => m.stage === "semi");
  const gf = data.matches.filter((m) => m.stage === "gf");
  return (
    <div className="grid gap-10">
      <div>
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Last Chance Qualifiers</h3>
        <div className="grid gap-3 md:grid-cols-3">{qf.map((m) => <MatchCard key={m.id} match={m} />)}</div>
      </div>
      <div>
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Semi Finals</h3>
        <div className="grid gap-3 md:grid-cols-3">{semis.map((m) => <MatchCard key={m.id} match={m} />)}</div>
      </div>
      <div>
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-2xl">Grand Finals (2 sets)</h3>
        <div className="grid gap-3 md:grid-cols-2">{gf.map((m) => <MatchCard key={m.id} match={m} />)}</div>
        {data.grandFinal.length ? (
          <ol className="mt-4 grid gap-2 sm:grid-cols-3">
            {data.grandFinal.map((row) => (
              <li key={row.teamId} className="flex justify-between rounded-xl bg-white/50 px-3 py-2">
                <span>
                  {row.rank}. {row.name}
                </span>
                <strong>{row.points} pts</strong>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
