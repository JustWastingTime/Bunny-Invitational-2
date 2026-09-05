"use client";

import { useState } from "react";
import { PLAY_IN_EVENT_LABEL } from "@/lib/constants";
import { NowNext } from "@/components/now-next";
import { GroupSchedule, KnockoutBoard, PlayInSchedule } from "@/components/tournament-ui";
import { PageTitle } from "@/components/site-chrome";
import { usePublicData } from "@/components/use-public-data";

type Board = "groups" | "playin" | "knockout";

export default function SchedulePage() {
  const { data } = usePublicData();
  const [board, setBoard] = useState<Board | null>(null);
  if (!data) return <p>Loading schedule…</p>;

  const nowStage = data.matches.find((m) => m.id === data.now?.matchId)?.stage;
  const active: Board =
    board ?? (nowStage === "playin" ? "playin" : nowStage && nowStage !== "group" ? "knockout" : "groups");
  const groupMatches = data.matches.filter((m) => m.stage === "group");
  const playInMatches = data.matches.filter((m) => m.stage === "playin");
  const nowId = data.now?.matchId;

  return (
    <div className="grid gap-10">
      <PageTitle kicker="Order of play" title="Schedule">
        Play-in is a Steiner triple of seven second clubs — same 3v3v3 as a group, all on {PLAY_IN_EVENT_LABEL}, with
        its own oshi and popularity pool. Then three groups of seven, then knockout.
      </PageTitle>
      <NowNext now={data.now} next={data.next} />

      <div>
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBoard("playin")}
            className={`rounded-full px-4 py-1.5 text-sm ${active === "playin" ? "bg-[var(--coral)] text-white" : "bg-white/70 text-[var(--ink-soft)]"}`}
          >
            Play-in
          </button>
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

        {active === "playin" ? (
          <PlayInSchedule matches={playInMatches} nowId={nowId} />
        ) : active === "groups" ? (
          <GroupSchedule matches={groupMatches} nowId={nowId} />
        ) : (
          <KnockoutBoard data={data} />
        )}
      </div>
    </div>
  );
}
