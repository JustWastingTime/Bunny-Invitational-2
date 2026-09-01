"use client";

import { useState } from "react";
import { NowNext } from "@/components/now-next";
import { GroupSchedule, KnockoutBoard } from "@/components/tournament-ui";
import { PageTitle } from "@/components/site-chrome";
import { usePublicData } from "@/components/use-public-data";

type Board = "groups" | "knockout";

export default function SchedulePage() {
  const { data } = usePublicData();
  const [board, setBoard] = useState<Board | null>(null);
  if (!data) return <p>Loading schedule…</p>;

  const nowStage = data.matches.find((m) => m.id === data.now?.matchId)?.stage;
  const active: Board = board ?? (nowStage && nowStage !== "group" ? "knockout" : "groups");
  const groupMatches = data.matches.filter((m) => m.stage === "group");
  const nowId = data.now?.matchId;

  return (
    <div className="grid gap-10">
      <PageTitle kicker="Order of play" title="Schedule">
        Three groups of seven. Five matches per group on day 1, two on day 2, then the knockout. One team finishes all three group matches on day 1 and sits out the remaining group matches.
      </PageTitle>
      <NowNext now={data.now} next={data.next} />

      <div>
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBoard("groups")}
            className={`rounded-full px-4 py-1.5 text-sm ${active === "groups" ? "bg-[var(--coral)] text-white" : "bg-white/70 text-[var(--ink-soft)]"}`}
          >
            Group stage
          </button>
          <button
            type="button"
            onClick={() => setBoard("knockout")}
            className={`rounded-full px-4 py-1.5 text-sm ${active === "knockout" ? "bg-[var(--coral)] text-white" : "bg-white/70 text-[var(--ink-soft)]"}`}
          >
            Knockout
          </button>
        </div>

        {active === "groups" ? (
          <GroupSchedule matches={groupMatches} nowId={nowId} />
        ) : (
          <KnockoutBoard data={data} />
        )}
      </div>
    </div>
  );
}
