"use client";

import { useState } from "react";
import { spriteFileName, spriteLocalPath } from "@/lib/sprites";
import type { PublicPayload } from "@/lib/types";

export function FieldStats({ stats }: { stats: PublicPayload["stats"] }) {
  const [tab, setTab] = useState<"umas" | "teams" | "skills">("umas");

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

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["umas", "Uma population"],
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

      {tab === "teams" ? (
        <div className="grid gap-6">
          <section className="min-w-0 overflow-x-auto rounded-2xl bg-[var(--surface)]">
            <h2 className="px-4 pt-4 font-[family-name:var(--font-display)] text-2xl">Stats</h2>
            <table className="ink-table min-w-[36rem]">
              <thead>
                <tr>
                  <th scope="col">Team</th>
                  <th scope="col" className="text-right">
                    Stats
                  </th>
                  <th scope="col" className="text-right">
                    Rating
                  </th>
                  <th scope="col" className="text-right">
                    Most skills
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.teamPowerByStats.map((team, index) => (
                  <tr key={team.teamId}>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0" style={{ background: team.color }} />
                        {index + 1}. {team.name}
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{team.totalStats.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{(team.rating ?? 0).toLocaleString()}</td>
                    <td className="text-right tabular-nums">{team.skills}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {stats.mostUniqueTeam ? (
            <p className="text-sm text-[var(--ink-soft)]">
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
