import type { Cue } from "@/lib/types";
import { LivePill } from "./site-chrome";

export function NowNext({ now, next }: { now: Cue; next: Cue }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CueBlock kind="now" cue={now} index={0} />
      <CueBlock kind="next" cue={next} index={1} />
    </div>
  );
}

function CueBlock({ kind, cue, index }: { kind: "now" | "next"; cue: Cue; index: number }) {
  const isNow = kind === "now";
  return (
    <article
      className={`rise relative overflow-hidden py-4 pl-6 pr-5 ring-1 ${
        isNow ? "bg-[var(--surface-2)] ring-[var(--line-strong)]" : "track-stripes bg-[var(--surface)] ring-[var(--line)]"
      }`}
      style={{ ["--i" as string]: index }}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1.5 ${isNow ? "bg-[var(--coral)]" : "bg-[var(--gold)]"}`}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <span className={`tote ${isNow ? "tote-coral" : "tote-gold"}`}>{isNow ? "Now" : "Next"}</span>
        {isNow && cue ? <LivePill /> : null}
        {cue ? <span className="kicker">{cue.categoryLabel}</span> : null}
      </div>
      {cue ? (
        <>
          <TeamVs teams={cue.teams} />
          <p className="mt-3 border-t border-dashed border-[var(--line-strong)] pt-2 text-sm text-[var(--ink-soft)]">
            {cue.matchLabel}
          </p>
        </>
      ) : (
        <p className="text-[var(--ink-soft)]">
          {isNow ? "Waiting for the first race." : "That’s the last race on the board."}
        </p>
      )}
    </article>
  );
}

export function TeamVs({ teams }: { teams: { name: string; color: string }[] }) {
  if (!teams.length) return <p className="display-lg text-2xl">TBD</p>;
  return (
    <p className="display-lg flex flex-wrap items-center gap-x-2.5 gap-y-1 text-2xl">
      {teams.map((team, i) => (
        <span key={`${team.name}-${i}`} className="inline-flex items-center gap-2">
          {i > 0 ? (
            <span className="font-sans text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              vs
            </span>
          ) : null}
          <span className="inline-block h-3 w-3 rounded-full ring-2 ring-[var(--surface-strong)]" style={{ background: team.color }} />
          {team.name}
        </span>
      ))}
    </p>
  );
}
