"use client";

import { useState } from "react";
import { PLAY_IN_EVENT_LABEL, PUBLIC_GROUPS_LIVE } from "@/lib/constants";
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
  const active: Board = PUBLIC_GROUPS_LIVE
    ? (board ?? (nowStage === "playin" ? "playin" : nowStage && nowStage !== "group" ? "knockout" : "groups"))
    : "playin";
  const groupMatches = data.matches.filter((m) => m.stage === "group");
  const playInMatches = data.matches.filter((m) => m.stage === "playin");
  const nowId = data.now?.matchId;

  return (
    <div className="grid gap-10">
      <PageTitle kicker="Order of play" title="Schedule">
        {PUBLIC_GROUPS_LIVE
          ? `Play-in is a Steiner triple of seven second clubs — same 3v3v3 as a group, all on ${PLAY_IN_EVENT_LABEL}, with its own oshi and popularity pool. Then three groups of seven, then knockout.`
          : `Play-in is seven Steiner triples on ${PLAY_IN_EVENT_LABEL}. Group draw lands closer to the main stage.`}
      </PageTitle>
      <NowNext now={data.now} next={data.next} />

      <div>
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBoard("playin")}
            className={`rounded-full px-4 py-1.5 text-sm ${active === "playin" ? "bg-[var(--coral)] text-white" : "bg-[var(--surface-2)] text-[var(--ink-soft)]"}`}
          >
            Play-in
          </button>
          <button
            type="button"
            disabled={!PUBLIC_GROUPS_LIVE}
            onClick={() => setBoard("groups")}
            title={PUBLIC_GROUPS_LIVE ? undefined : "Group draw lands closer to the tournament"}
            className={`rounded-full px-4 py-1.5 text-sm ${
              PUBLIC_GROUPS_LIVE
                ? active === "groups"
                  ? "bg-[var(--coral)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--ink-soft)]"
                : "cursor-not-allowed bg-[var(--surface-2)] text-[var(--ink-soft)] opacity-45"
            }`}
          >
            Group stage
          </button>
          <button
            type="button"
            disabled={!PUBLIC_GROUPS_LIVE}
            onClick={() => setBoard("knockout")}
            title={PUBLIC_GROUPS_LIVE ? undefined : "Knockout bracket lands closer to the tournament"}
            className={`rounded-full px-4 py-1.5 text-sm ${
              PUBLIC_GROUPS_LIVE
                ? active === "knockout"
                  ? "bg-[var(--coral)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--ink-soft)]"
                : "cursor-not-allowed bg-[var(--surface-2)] text-[var(--ink-soft)] opacity-45"
            }`}
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
