"use client";

import { useMemo, useState } from "react";
import { NowNext } from "@/components/now-next";
import { PageTitle } from "@/components/site-chrome";
import { GroupTable, KnockoutBoard, ScorerList } from "@/components/tournament-ui";
import { usePublicData } from "@/components/use-public-data";
import { PUBLIC_GROUPS_LIVE, PUBLIC_TOURNAMENT_LIVE } from "@/lib/constants";

export default function ScoreboardPage() {
  const { data } = usePublicData(3000);
  const [matchId, setMatchId] = useState<string | null>(null);
  const selected = useMemo(() => {
    if (!data) return null;
    return data.matches.find((m) => m.id === (matchId ?? data.now?.matchId ?? data.matches[0]?.id)) ?? null;
  }, [data, matchId]);

  if (!data) return <p>Loading scoreboard…</p>;

  return (
    <div className="grid gap-10">
      <PageTitle kicker={PUBLIC_TOURNAMENT_LIVE ? "Live" : "The board"} title="Scoreboard">
        {PUBLIC_GROUPS_LIVE
          ? "Group tables, knockout, and who actually scored the points."
          : "Play-in standings until the group draw. Maps are up on the Maps page."}
      </PageTitle>
      <NowNext now={data.now} next={data.next} />

      {PUBLIC_GROUPS_LIVE ? (
        <div className="grid gap-10 xl:grid-cols-3">
          {data.groups.map((g) => (
            <GroupTable key={g.id} group={g.id} standings={g.standings} />
          ))}
        </div>
      ) : null}

      {data.playIn?.standings?.length ? (
        <GroupTable group="Play-in" standings={data.playIn.standings} />
      ) : null}

      {PUBLIC_GROUPS_LIVE ? <KnockoutBoard data={data} /> : null}

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-3xl">Who scored</h2>
          <select
            className="rounded-full bg-white/80 px-3 py-2 text-sm"
            value={selected?.id ?? ""}
            onChange={(e) => setMatchId(e.target.value)}
          >
            {data.matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {selected ? <ScorerList match={selected} /> : null}
      </section>
    </div>
  );
}
