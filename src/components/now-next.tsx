import type { Cue } from "@/lib/types";
import { LivePill } from "./site-chrome";

export function NowNext({ now, next }: { now: Cue; next: Cue }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CueBlock kind="now" cue={now} />
      <CueBlock kind="next" cue={next} />
    </div>
  );
}

function CueBlock({ kind, cue }: { kind: "now" | "next"; cue: Cue }) {
  return (
    <article className={`rounded-2xl px-5 py-4 ${kind === "now" ? "bg-white/70" : "bg-[var(--peach)]/55"}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="kicker">{kind === "now" ? "Now" : "Up next"}</p>
        {kind === "now" && cue ? <LivePill /> : null}
        {cue ? <span className="text-sm text-[var(--coral-ink)]">{cue.categoryLabel}</span> : null}
      </div>
      {cue ? (
        <>
          <TeamVs teams={cue.teams} />
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{cue.matchLabel}</p>
        </>
      ) : (
        <p className="text-[var(--ink-soft)]">
          {kind === "now" ? "Waiting for the first race." : "That’s the last race on the board."}
        </p>
      )}
    </article>
  );
}

export function TeamVs({ teams }: { teams: { name: string; color: string }[] }) {
  if (!teams.length) return <p className="font-[family-name:var(--font-display)] text-xl">TBD</p>;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-display)] text-xl leading-snug">
      {teams.map((team, i) => (
        <span key={`${team.name}-${i}`} className="inline-flex items-center gap-1.5">
          {i > 0 ? <span className="px-0.5 text-sm font-sans text-[var(--ink-soft)]">vs</span> : null}
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: team.color }} />
          {team.name}
        </span>
      ))}
    </p>
  );
}
