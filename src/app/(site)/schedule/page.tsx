"use client";

import { useState } from "react";
import { PLAY_IN_EVENT_LABEL, PUBLIC_GROUPS_LIVE } from "@/lib/constants";
import { NowNext } from "@/components/now-next";
import { GroupSchedule, KnockoutBoard, PlayInSchedule } from "@/components/tournament-ui";
import { DataError, Loading, PageTitle } from "@/components/site-chrome";
import { usePublicData } from "@/components/use-public-data";

type Board = "groups" | "playin" | "knockout";

export default function SchedulePage() {
  const { data, error } = usePublicData();
  const [board, setBoard] = useState<Board | null>(null);
  if (!data) return error ? <DataError what="schedule" /> : <Loading what="schedule" />;

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
          ? `Play-in is a battle between seven second clubs — same 3v3v3 as a group, all on ${PLAY_IN_EVENT_LABEL}, with its own oshi and popularity pool. Then three groups of seven, then knockout.`
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
            disabled={!PUBLIC_GROUPS_LIVE}
            onClick={() => setBoard("groups")}
          >
            Group stage
          </BoardTab>
          <BoardTab
            active={active === "knockout"}
            disabled={!PUBLIC_GROUPS_LIVE}
            onClick={() => setBoard("knockout")}
          >
            Knockout
          </BoardTab>
        </div>
        {PUBLIC_GROUPS_LIVE ? null : (
          <p className="mb-6 text-sm text-[var(--ink-soft)]">
            The group stage and knockout boards open once the group draw is done. Until then, only the play-in is
            scheduled.
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
      className={`rounded-full px-4 py-1.5 text-sm ${
        disabled
          ? "cursor-not-allowed bg-[var(--surface-2)] text-[var(--ink-soft)] opacity-45"
          : active
            ? "bg-[var(--accent-solid)] font-semibold text-[var(--accent-on-solid)]"
            : "bg-[var(--surface-2)] text-[var(--ink-soft)]"
      }`}
    >
      {children}
    </button>
  );
}
