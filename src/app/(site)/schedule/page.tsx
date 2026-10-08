"use client";

import { useState } from "react";
import { PLAY_IN_EVENT_LABEL, PUBLIC_BOARDS_LIVE, PUBLIC_GROUP_SCHEDULE, PUBLIC_GROUPS_LIVE, PUBLIC_KNOCKOUT_SCHEDULE, mainStageDayLabel } from "@/lib/constants";
import { NowNext } from "@/components/now-next";
import { GroupSchedule, KnockoutBoard, PlayInSchedule } from "@/components/tournament-ui";
import { ComingSoon, DataError, Loading, PageTitle } from "@/components/site-chrome";
import { usePublicData } from "@/components/use-public-data";

type Board = "groups" | "playin" | "knockout";

export default function SchedulePage() {
  const { data, error } = usePublicData();
  const [board, setBoard] = useState<Board | null>(null);
  if (!PUBLIC_BOARDS_LIVE) {
    return (
      <ComingSoon kicker="Order of play" title="Schedule">
        The match order is off the public site for now.
      </ComingSoon>
    );
  }
  if (!data) return error ? <DataError what="schedule" /> : <Loading what="schedule" />;

  const nowStage = data.matches.find((m) => m.id === data.now?.matchId)?.stage;
  const groupsOpen = PUBLIC_GROUP_SCHEDULE || PUBLIC_GROUPS_LIVE;
  const knockoutOpen = PUBLIC_KNOCKOUT_SCHEDULE || PUBLIC_GROUPS_LIVE;
  const active: Board = groupsOpen
    ? (board ?? (nowStage === "playin" ? "playin" : nowStage && nowStage !== "group" && knockoutOpen ? "knockout" : "groups"))
    : "playin";
  const groupMatches = data.matches.filter((m) => m.stage === "group");
  const playInMatches = data.matches.filter((m) => m.stage === "playin");
  const nowId = data.now?.matchId;

  return (
    <div className="grid gap-10">
      <PageTitle kicker="Order of play" title="Schedule">
        {groupsOpen
          ? `Play-in is a battle between seven second clubs — same 3v3v3 as a group, all on ${PLAY_IN_EVENT_LABEL}, with its own oshi and popularity pool. The main stage is three days: group matches 1–3 on ${mainStageDayLabel(1)}, matches 4–7 on ${mainStageDayLabel(2)}, then last chance, semis, and finals on ${mainStageDayLabel(3)}.`
          : `Play-ins. Seven in. One remains. ${PLAY_IN_EVENT_LABEL}. Group draw lands closer to the main stage.`}
      </PageTitle>
      <NowNext now={data.now} next={data.next} />

      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          <BoardTab active={active === "playin"} onClick={() => setBoard("playin")}>
            Play-in
          </BoardTab>
          <BoardTab
            active={active === "groups"}
            disabled={!groupsOpen}
            onClick={() => setBoard("groups")}
          >
            Group stage
          </BoardTab>
          <BoardTab
            active={active === "knockout"}
            disabled={!knockoutOpen}
            onClick={() => setBoard("knockout")}
          >
            Knockout
          </BoardTab>
        </div>
        {groupsOpen && knockoutOpen ? null : (
          <p className="mb-6 text-sm text-[var(--ink-soft)]">
            The group stage and knockout boards open once the group draw is done. Until then, only the play-in is scheduled.
          </p>
        )}

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

function BoardTab({
  active,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={disabled ? undefined : active}
      onClick={onClick}
      className={`px-4 py-1.5 text-sm font-bold uppercase tracking-[0.09em] ${
        disabled
          ? "cursor-not-allowed bg-[var(--surface-2)] text-[var(--ink-soft)] opacity-45"
          : active
            ? "slant bg-[var(--accent-solid)] text-[var(--accent-on-solid)]"
            : "bg-[var(--surface-2)] text-[var(--ink-soft)] ring-1 ring-[var(--line)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}
