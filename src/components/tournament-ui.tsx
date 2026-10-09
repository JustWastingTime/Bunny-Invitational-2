"use client";

import type { GroupStandingRow, PublicMatch, PublicPayload, PublicPlacement } from "@/lib/types";
import { GROUPS, PLAY_IN_EVENT_LABEL, mainStageDayLabel } from "@/lib/constants";
import { spriteLocalPath } from "@/lib/sprites";

export function GroupTable({
  group,
  standings,
  note,
}: {
  group: string;
  standings: GroupStandingRow[];
  note?: string;
}) {
  const playIn = group === "Play-in" || group === "P";
  return (
    <section className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-1.5">
        <h3 className="display-lg text-2xl">{playIn ? "Play-in" : `Group ${group}`}</h3>
        <p className="text-xs text-[var(--ink-soft)]">
          {note ?? (playIn ? "Own oshi & popularity pool" : "Top 2 Semis · 3–5 LCQ")}
        </p>
      </div>
      <div className="overflow-x-auto bg-[var(--surface)] ring-1 ring-[var(--line)]">
        <table className="ink-table min-w-[22rem]">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Team</th>
              {playIn ? null : <th scope="col">Advances</th>}
              <th scope="col" className="text-right">Pts</th>
              <th scope="col" className="text-right">W</th>
              <th scope="col" className="text-right">1st</th>
              <th scope="col" className="text-right">GP</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => {
              const outcome = playIn ? null : row.rank <= 2 ? "Semis" : row.rank <= 5 ? "LCQ" : null;
              return (
                <tr key={row.teamId} className={outcome === "Semis" ? "qualify" : outcome === "LCQ" ? "playoff" : ""}>
                  <td>
                    <span className="tote">{row.rank}</span>
                  </td>
                  <td>
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                    {row.name}
                  </td>
                  {playIn ? null : (
                    <td>
                      {outcome ? <OutcomeTag>{outcome}</OutcomeTag> : <span className="text-[var(--ink-soft)]">Out</span>}
                    </td>
                  )}
                  <td className="text-right font-semibold">{row.points}</td>
                  <td className="text-right">{row.wins}</td>
                  <td className="text-right">{row.firsts}</td>
                  <td className="text-right">{row.matchesPlayed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {playIn ? null : (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-1.5">
            <OutcomeTag>Semis</OutcomeTag> top 2 go straight to the Semi Finals
          </span>
          <span className="inline-flex items-center gap-1.5">
            <OutcomeTag>LCQ</OutcomeTag> 3rd–5th go to the Last Chance Qualifiers
          </span>
        </p>
      )}
    </section>
  );
}

function OutcomeTag({ children }: { children: string }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-[3px] border border-black/15 bg-[var(--chip-base)] px-2 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-[var(--chip-ink)]">
      {children}
    </span>
  );
}

export function MatchCard({ match, highlight }: { match: PublicMatch; highlight?: boolean }) {
  return (
    <article className={`rounded-2xl px-4 py-3 ${highlight ? "bg-[var(--gold)]/40" : "bg-[var(--surface)]"}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="font-[family-name:var(--font-display)] text-base leading-tight">{match.label}</h3>
        {highlight ? <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--coral-ink)]">Now</span> : null}
      </div>
      <MatchTeams match={match} />
    </article>
  );
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
    <article className={`rounded-xl px-3 py-2.5 ${highlight ? "bg-[var(--gold)]/40" : "bg-[var(--surface)]"}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">{match.label}</h4>
        {highlight ? (
          <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--coral-ink)]">Now</span>
        ) : null}
      </div>
      <MatchTeams match={match} />
    </article>
  );
}

export function GroupSchedule({
  matches,
  nowId,
}: {
  matches: PublicMatch[];
  nowId?: string | null;
}) {
  return (
    <div className="grid gap-10">
      {[1, 2].map((day) => (
        <section key={day}>
          <div className="mb-3">
            <h3 className="font-[family-name:var(--font-display)] text-2xl">Day {day}</h3>
            <p className="kicker">{mainStageDayLabel(day)}</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {GROUPS.map((group) => {
              const groupMatches = matches
                .filter((m) => m.group === group && m.day === day)
                .sort((a, b) => a.sortOrder - b.sortOrder);
              return (
                <div key={group}>
                  <h4 className="mb-2 text-sm font-bold uppercase tracking-[0.09em] text-[var(--ink-soft)]">
                    Group {group}
                  </h4>
                  <DayColumn matches={groupMatches} nowId={nowId} />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function PlayInSchedule({
  title = "Play-in",
  matches,
  nowId,
  onPick,
}: {
  title?: string;
  matches: PublicMatch[];
  nowId?: string | null;
  onPick?: (matchId: string) => void;
}) {
  const rows = [...matches].sort((a, b) => a.day - b.day || a.sortOrder - b.sortOrder);
  const byDay = new Map<number, PublicMatch[]>();
  for (const match of rows) {
    const list = byDay.get(match.day) ?? [];
    list.push(match);
    byDay.set(match.day, list);
  }
  const playIn = rows[0]?.stage === "playin";
  return (
    <section className="min-w-0">
      <h3 className="mb-3 font-[family-name:var(--font-display)] text-2xl">{title}</h3>
      {[...byDay.entries()].map(([day, dayMatches], i) => (
        <DayColumn
          key={day}
          label={playIn ? PLAY_IN_EVENT_LABEL : mainStageDayLabel(day)}
          matches={dayMatches}
          nowId={nowId}
          onPick={onPick}
          className={i ? "mt-5" : ""}
        />
      ))}
    </section>
  );
}


function DayColumn({
  label = "",
  matches,
  nowId,
  className = "",
  onPick,
}: {
  label?: string;
  matches: PublicMatch[];
  nowId?: string | null;
  className?: string;
  onPick?: (matchId: string) => void;
}) {
  if (!matches.length) return null;
  return (
    <div className={className}>
      {label ? <p className="kicker mb-2">{label}</p> : null}
      <div className="grid gap-2">
        {matches.map((match) => {
          const card = <CompactMatch match={match} highlight={match.id === nowId} />;
          if (!onPick) return <div key={match.id}>{card}</div>;
          return (
            <button key={match.id} type="button" className="text-left" onClick={() => onPick(match.id)}>
              {card}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function listedScorer(placement: PublicPlacement) {
  return placement.net !== 0 || (placement.place >= 1 && placement.place <= 5);
}

export function ScorerList({ match }: { match: PublicMatch }) {
  const any = match.races.some((race) => race.placements.some(listedScorer));
  if (!any)
    return (
      <p className="border-l-4 border-[var(--gold)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--ink-soft)]">
        No points scored yet. Placements appear here as each race is called in.
      </p>
    );
  return (
    <div className="grid gap-6">
      {match.races.map((race) => {
        const scorers = race.placements.filter(listedScorer).sort((a, b) => a.place - b.place);
        return (
          <section key={race.category} className="min-w-0">
            <h3 className="mb-2 font-[family-name:var(--font-display)] text-2xl">{race.label}</h3>
            {scorers.length ? (
              <div className="overflow-x-auto bg-[var(--surface)] ring-1 ring-[var(--line)]">
                <table className="ink-table">
                  <thead>
                    <tr>
                      <th scope="col">Place</th>
                      <th scope="col">Player</th>
                      <th scope="col">Team</th>
                      <th scope="col" className="text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorers.map((p, index) => (
                      <tr key={`${match.id}-${race.category}-${p.place}-${p.teamId}-${p.slot}`}>
                        <td>{boardPlace(index, scorers.length, p.place)}</td>
                        <td>
                          <ScorerRunner placement={p} />
                        </td>
                        <td>{p.teamName}</td>
                        <td className="text-right font-semibold text-[var(--coral-ink)]">
                          {p.net > 0 ? `+${p.net}` : p.net}
                          {p.penalty ? <span className="mt-0.5 block text-xs font-normal text-[var(--ink-soft)]">pop {p.penalty}</span> : null}
                          {p.uniqueBonus ? (
                            <span className="mt-0.5 block text-xs font-normal text-[var(--ink-soft)]">unique +{p.uniqueBonus}</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink-soft)] ring-1 ring-[var(--line)]">
                No points in this distance yet.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function boardPlace(index: number, count: number, stored: number) {
  if (count <= 5) return index + 1;
  return stored >= 1 && stored <= 5 ? stored : "—";
}

function ScorerRunner({ placement }: { placement: PublicPlacement }) {
  const local = spriteLocalPath(placement.spriteId);
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--paper-2)]">
        {placement.spritePath || local ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={placement.spritePath || local || ""}
            alt=""
            className="h-10 w-10 object-contain"
            onError={(event) => {
              if (!local || event.currentTarget.src.endsWith(local)) return;
              event.currentTarget.src = local;
            }}
          />
        ) : (
          <span className="text-[0.65rem] text-[var(--ink-soft)]">?</span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold leading-tight">{placement.trainer.trim() || "—"}</span>
        <span className="block truncate text-sm text-[var(--ink-soft)]">{placement.umaName || "TBD"}</span>
      </span>
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
        <h3 className="font-[family-name:var(--font-display)] text-2xl">Day 3</h3>
        <p className="kicker mb-4">{mainStageDayLabel(3)}</p>
      </div>
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
              <li key={row.teamId} className="flex justify-between rounded-xl bg-[var(--surface)] px-3 py-2">
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
