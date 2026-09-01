"use client";

import { useState } from "react";
import { PageTitle } from "@/components/site-chrome";
import { usePublicData } from "@/components/use-public-data";

export default function StatsPage() {
  const { data } = usePublicData(8000);
  const [tab, setTab] = useState<"umas" | "teams" | "skills">("umas");
  if (!data) return <p>Loading stats…</p>;
  const s = data.stats;

  return (
    <div className="grid gap-8">
      <PageTitle kicker="The meta" title="Stats">
        Who brought what, who’s popping off, and which skills are everywhere.
      </PageTitle>

      <dl className="grid gap-6 rounded-2xl bg-white/50 px-5 py-5 sm:grid-cols-3">
        <div>
          <dt className="kicker">Unique costumes</dt>
          <dd className="mt-1 font-[family-name:var(--font-display)] text-3xl">{s.uniqueCount}</dd>
        </div>
        <div>
          <dt className="kicker">Most picked (costume)</dt>
          <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl">
            {s.mostPopular ? `${s.mostPopular.name} ×${s.mostPopular.count}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="kicker">Most picked (any skin)</dt>
          <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl">
            {s.mostPopularCombined ? `${s.mostPopularCombined.name} ×${s.mostPopularCombined.count}` : "—"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        {(["umas", "teams", "skills"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm ${tab === key ? "bg-[var(--coral)] text-white" : "bg-white/70 text-[var(--ink-soft)]"}`}
          >
            {key === "umas" ? "Uma population" : key === "teams" ? "Team strength" : "Skill meta"}
          </button>
        ))}
      </div>

      {tab === "umas" ? (
        <div className="overflow-x-auto rounded-2xl bg-white/50">
          <table className="ink-table min-w-[36rem]">
            <thead>
              <tr>
                <th>Uma</th>
                <th className="text-right">Picks</th>
                <th className="text-right">Starts</th>
                <th className="text-right">Wins</th>
                <th className="text-right">Top 5</th>
                <th className="text-right">Win%</th>
              </tr>
            </thead>
            <tbody>
              {s.umaPopulation.map((u) => (
                <tr key={u.spriteId}>
                  <td>
                    {u.name} {u.unique ? <span className="text-xs text-[var(--coral-ink)]">unique</span> : null}
                  </td>
                  <td className="text-right">{u.count}</td>
                  <td className="text-right">{u.starts}</td>
                  <td className="text-right">{u.wins}</td>
                  <td className="text-right">{u.top5}</td>
                  <td className="text-right">{Math.round(u.winRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "teams" ? (
        <div className="grid gap-10 md:grid-cols-2">
          <ol>
            <h2 className="mb-2 font-[family-name:var(--font-display)] text-2xl">Build stats (not standings)</h2>
            {s.teamPowerByStats.slice(0, 10).map((t, i) => (
              <li key={t.teamId} className="flex justify-between py-1.5 text-sm">
                <span>
                  {i + 1}. {t.name}
                </span>
                <span>{t.totalStats.toLocaleString()}</span>
              </li>
            ))}
          </ol>
          <ol>
            <h2 className="mb-2 font-[family-name:var(--font-display)] text-2xl">Most skills</h2>
            {s.teamPowerBySkills.slice(0, 10).map((t, i) => (
              <li key={t.teamId} className="flex justify-between py-1.5 text-sm">
                <span>
                  {i + 1}. {t.name}
                </span>
                <span>{t.skills}</span>
              </li>
            ))}
          </ol>
          {s.mostUniqueTeam ? (
            <p className="md:col-span-2 text-sm text-[var(--ink-soft)]">
              Most unique costumes: <strong>{s.mostUniqueTeam.name}</strong> ({s.mostUniqueTeam.uniquePicks})
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "skills" ? (
        <div className="grid gap-10 md:grid-cols-2">
          <SkillList title="Most common" items={s.skillsCommon} />
          <SkillList title="Rarest taken" items={s.skillsRare} />
        </div>
      ) : null}
    </div>
  );
}

function SkillList({ title, items }: { title: string; items: { name: string; count: number }[] }) {
  return (
    <section>
      <h2 className="mb-2 font-[family-name:var(--font-display)] text-2xl">{title}</h2>
      <ol>
        {items.map((s) => (
          <li key={s.name} className="flex justify-between py-1.5 text-sm">
            <span>{s.name}</span>
            <span>{s.count}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
