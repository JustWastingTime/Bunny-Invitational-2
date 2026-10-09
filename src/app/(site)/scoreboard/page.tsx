"use client";

import { useMemo, useState } from "react";
import { NowNext } from "@/components/now-next";
import { DataError, Loading, PageTitle } from "@/components/site-chrome";
import { GroupTable, KnockoutBoard, ScorerList } from "@/components/tournament-ui";
import { usePublicData } from "@/components/use-public-data";
import { PUBLIC_GROUPS_LIVE, PUBLIC_TOURNAMENT_LIVE } from "@/lib/constants";

export default function ScoreboardPage() {
  const { data, error } = usePublicData(3000);
  const [matchId, setMatchId] = useState<string | null>(null);
  const matches = useMemo(() => data?.matches.filter((match) => match.stage !== "playin") ?? [], [data]);
  const selected = useMemo(() => {
    if (!data) return null;
    const preferred = matchId ?? (data.now && matches.some((match) => match.id === data.now?.matchId) ? data.now.matchId : matches[0]?.id);
    return matches.find((match) => match.id === preferred) ?? null;
  }, [data, matchId, matches]);

  if (!data) return error ? <DataError what="scoreboard" /> : <Loading what="scoreboard" />;

  return (
    <div className="grid gap-10">
      <PageTitle kicker={PUBLIC_TOURNAMENT_LIVE ? "Live" : "The board"} title="Scoreboard">
        {PUBLIC_GROUPS_LIVE
          ? "Group tables, knockout, and who actually scored the points."
          : "Group scores and who actually scored the points."}
      </PageTitle>
      <NowNext now={data.now} next={data.next} />

      {data.groups.length ? (
        <div className="grid gap-10 xl:grid-cols-3">
          {data.groups.map((g) => (
            <GroupTable key={g.id} group={g.id} standings={g.standings} />
          ))}
        </div>
      ) : null}

      {PUBLIC_GROUPS_LIVE ? <KnockoutBoard data={data} /> : null}

      <section className="min-w-0">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="display-lg text-3xl">Who scored</h2>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-extrabold uppercase tracking-[0.09em] text-[var(--ink-soft)] sm:items-end">
            Match
            <select
              className="w-full max-w-full truncate rounded-[3px] bg-[var(--surface-2)] px-3 py-2 text-base font-normal normal-case tracking-normal text-[var(--ink)] ring-1 ring-[var(--line)] sm:w-auto sm:text-sm"
              value={selected?.id ?? ""}
              onChange={(e) => setMatchId(e.target.value)}
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selected ? <ScorerList match={selected} /> : null}
      </section>
    </div>
  );
}
