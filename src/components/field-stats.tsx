"use client";

import Link from "next/link";
import { useState } from "react";
import { spriteFileName, spriteLocalPath } from "@/lib/sprites";
import type { PlayerForm, PublicPayload, PublicTeam, TeamPower, TopScoreUma } from "@/lib/types";

export function FieldStats({ stats, teams }: { stats: PublicPayload["stats"]; teams?: PublicTeam[] }) {
  const [tab, setTab] = useState<"umas" | "teams" | "skills" | "players">("umas");
  const topScores = stats.topScores?.length ? stats.topScores : scoresFromTeams(teams);

  return (
    <div className="grid gap-8">
      <dl className="grid gap-6 rounded-2xl bg-[var(--surface)] px-5 py-5 sm:grid-cols-3">
        <div>
          <dt className="kicker">Unique costumes</dt>
          <dd className="mt-1 font-[family-name:var(--font-display)] text-3xl">{stats.uniqueCount}</dd>
        </div>
        <div>
          <dt className="kicker">Most picked (costume)</dt>
          <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl">
            {stats.mostPopular ? `${stats.mostPopular.name} ×${stats.mostPopular.count}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="kicker">Most picked (any skin)</dt>
          <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl">
            {stats.mostPopularCombined ? `${stats.mostPopularCombined.name} ×${stats.mostPopularCombined.count}` : "—"}
          </dd>
        </div>
      </dl>

      {topScores.length ? (
        <section>
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-2xl">Highest scores</h2>
          <ol className="grid gap-1">
            {topScores.map((uma, index) => (
              <li key={`${uma.teamId}-${uma.category}-${uma.slot}`}>
                <Link
                  href={`/teams/${uma.teamId}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-[var(--surface)]"
                >
                  <span className="w-6 shrink-0 tabular-nums text-[var(--ink-soft)]">{index + 1}</span>
                  <UmaSprite spriteId={uma.spriteId} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{uma.umaName}</span>
                    <span className="flex min-w-0 items-center gap-2 text-[var(--ink-soft)]">
                      <span className="h-2.5 w-2.5 shrink-0" style={{ background: uma.color }} />
                      <span className="truncate">{uma.trainer || uma.teamName}</span>
                    </span>
                  </span>
                  <span className="shrink-0 font-bold tracking-wide">{uma.rating || "—"}</span>
                  <span className="w-[4.5rem] shrink-0 text-right tabular-nums">{uma.score.toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["umas", "Uma population"],
            ["players", "Players"],
            ["teams", "Team strength"],
            ["skills", "Skill meta"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`px-4 py-1.5 text-sm font-bold uppercase tracking-[0.09em] ${
              tab === key
                ? "slant bg-[var(--accent-solid)] text-[var(--accent-on-solid)]"
                : "bg-[var(--surface-2)] text-[var(--ink-soft)] ring-1 ring-[var(--line)] hover:text-[var(--ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "umas" ? (
        <div className="min-w-0 overflow-x-auto rounded-2xl bg-[var(--surface)]">
          <table className="ink-table min-w-[36rem]">
            <thead>
              <tr>
                <th scope="col">Uma</th>
                <th scope="col" className="text-right">
                  Picks
                </th>
                <th scope="col" className="text-right">
                  Starts
                </th>
                <th scope="col" className="text-right">
                  Wins
                </th>
                <th scope="col" className="text-right">
                  Top 5
                </th>
                <th scope="col" className="text-right">
                  Win%
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.umaPopulation.map((uma) => (
                <tr key={uma.spriteId}>
                  <td>
                    <span className="flex items-center gap-2">
                      <UmaSprite spriteId={uma.spriteId} />
                      <span>
                        {uma.name} {uma.unique ? <span className="text-xs text-[var(--coral-ink)]">unique</span> : null}
                      </span>
                    </span>
                  </td>
                  <td className="text-right">{uma.count}</td>
                  <td className="text-right">{uma.starts}</td>
                  <td className="text-right">{uma.wins}</td>
                  <td className="text-right">{uma.top5}</td>
                  <td className="text-right">{Math.round(uma.winRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "players" ? <PlayerTable rows={stats.playerTable ?? []} /> : null}

      {tab === "teams" ? (
        <div className="grid gap-10 lg:grid-cols-3">
          <TeamRank title="Stats" teams={stats.teamPowerByStats} value={(team) => team.totalStats.toLocaleString()} />
          <TeamRank title="Score" teams={stats.teamPowerByScore} value={(team) => team.totalScore.toLocaleString()} />
          <TeamRank title="Skills" teams={stats.teamPowerBySkills} value={(team) => team.skills.toLocaleString()} />
          {stats.mostUniqueTeam ? (
            <p className="text-sm text-[var(--ink-soft)] lg:col-span-3">
              Most unique costumes: <strong>{stats.mostUniqueTeam.name}</strong> ({stats.mostUniqueTeam.uniquePicks})
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "skills" ? (
        <div className="grid gap-10 md:grid-cols-2">
          <SkillList title="Most common" items={stats.skillsCommon} />
          <SkillList title="Rarest taken" items={stats.skillsRare} />
        </div>
      ) : null}
    </div>
  );
}

function scoresFromTeams(teams: PublicTeam[] | undefined): TopScoreUma[] {
  if (!teams?.length) return [];
  return teams
    .filter((team) => team.kind !== "playin")
    .flatMap((team) =>
      team.roster.map((uma) => ({
        teamId: team.id,
        teamName: team.name,
        shortName: team.shortName,
        color: team.color,
        trainer: uma.trainer.trim(),
        umaName: uma.umaName,
        spriteId: uma.spriteId,
        rating: uma.rating?.trim() ?? "",
        score: Number(String(uma.score ?? "").replace(/[^\d.]/g, "")) || 0,
        category: uma.category,
        slot: uma.slot,
      })),
    )
    .filter((uma) => uma.score > 0)
    .sort((a, b) => b.score - a.score || a.umaName.localeCompare(b.umaName))
    .slice(0, 10);
}

function signedPoints(n: number) {
  if (n > 0) return `+${n}`;
  return String(n);
}

function PlayerTable({ rows }: { rows: PlayerForm[] }) {
  if (!rows.length) {
    return <p className="text-sm text-[var(--ink-soft)]">No races scored yet.</p>;
  }
  return (
    <div className="min-w-0 overflow-x-auto rounded-2xl bg-[var(--surface)]">
      <table className="ink-table min-w-[52rem]">
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Team</th>
            <th scope="col" className="text-right">
              PPG
            </th>
            <th scope="col" className="text-right">
              GP
            </th>
            <th scope="col" className="text-right">
              Pts
            </th>
            <th scope="col" className="text-right">
              Place
            </th>
            <th scope="col" className="text-right">
              Oshi
            </th>
            <th scope="col" className="text-right">
              Penalty
            </th>
            <th scope="col" className="text-right">
              Wins
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.teamId}-${row.category}-${row.slot}`}>
              <td>
                <Link href={`/teams/${row.teamId}`} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 tabular-nums text-[var(--ink-soft)]">{index + 1}</span>
                  <UmaSprite spriteId={row.spriteId} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{row.trainer || "—"}</span>
                    <span className="block truncate text-sm text-[var(--ink-soft)]">{row.umaName}</span>
                  </span>
                </Link>
              </td>
              <td>
                <Link href={`/teams/${row.teamId}`} className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0" style={{ background: row.color }} />
                  {row.shortName}
                </Link>
              </td>
              <td className="text-right font-semibold tabular-nums">{row.ppg.toFixed(1)}</td>
              <td className="text-right tabular-nums">{row.games}</td>
              <td className="text-right tabular-nums">{signedPoints(row.points)}</td>
              <td className="text-right tabular-nums">{row.placePoints}</td>
              <td className="text-right tabular-nums">{signedPoints(row.oshi)}</td>
              <td className="text-right tabular-nums">{signedPoints(row.penalty)}</td>
              <td className="text-right tabular-nums">{row.wins}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamRank({
  title,
  teams,
  value,
}: {
  title: string;
  teams: TeamPower[];
  value: (team: TeamPower) => string;
}) {
  return (
    <section>
      <h2 className="mb-2 font-[family-name:var(--font-display)] text-2xl">{title}</h2>
      <ol>
        {teams.map((team, index) => (
          <li key={team.teamId} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0" style={{ background: team.color }} />
              <span className="truncate">
                {index + 1}. {team.name}
              </span>
            </span>
            <span className="shrink-0 tabular-nums">{value(team)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function UmaSprite({ spriteId }: { spriteId: string }) {
  const local = spriteLocalPath(spriteId);
  const remote = spriteFileName(spriteId);
  const src = local || remote;
  if (!src) return <span className="inline-block h-8 w-8" />;
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-8 w-8 object-contain"
        onError={(event) => {
          if (!remote || event.currentTarget.src === remote) return;
          event.currentTarget.src = remote;
        }}
      />
    </span>
  );
}

function SkillList({ title, items }: { title: string; items: { name: string; count: number }[] }) {
  return (
    <section>
      <h2 className="mb-2 font-[family-name:var(--font-display)] text-2xl">{title}</h2>
      <ol>
        {items.map((skill) => (
          <li key={skill.name} className="flex justify-between py-1.5 text-sm">
            <span>{skill.name}</span>
            <span>{skill.count}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
