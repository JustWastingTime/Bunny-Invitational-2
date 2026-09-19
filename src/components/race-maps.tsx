import { CATEGORY_LABEL, RACE_MAPS, type RaceMap } from "@/lib/constants";

export function MapsGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-4 ${compact ? "sm:grid-cols-2 xl:grid-cols-5" : "gap-5 md:grid-cols-2 xl:grid-cols-3"}`}>
      {RACE_MAPS.map((map, i) => (
        <article
          key={map.category}
          className="lift rise flex flex-col bg-[var(--surface-2)] ring-1 ring-[var(--line)]"
          style={{ ["--i" as string]: i }}
        >
          <div className="flex items-start gap-3 px-4 pt-4">
            <span aria-hidden className="tote tote-gold text-base">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="kicker">{CATEGORY_LABEL[map.category]}</p>
              <h3 className="display-lg text-xl leading-tight">
                {map.venue} {map.distanceM}m
              </h3>
            </div>
          </div>
          <p className="mt-2 px-4 text-sm text-[var(--ink-soft)]">
            {[map.course, map.direction, map.surface].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap gap-1.5 px-4 pb-4 pt-3">
            <Pill tone={seasonTone(map.season)}>{map.season}</Pill>
            <Pill>{map.weather}</Pill>
            <Pill>{map.going}</Pill>
          </div>
          {compact ? null : (
            <div className="mt-auto px-4 pb-4">
              <TrackRibbon layout={map.layout} />
              <div className="mt-2 flex justify-between text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">
                <span>0</span>
                <span>{map.distanceM}m</span>
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function Pill({ children, tone }: { children: string; tone?: string }) {
  return (
    <span
      className="rounded-[3px] border border-black/15 px-2 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.08em]"
      style={{
        background: tone ?? "color-mix(in srgb, var(--peach) 70%, var(--chip-base))",
        color: "var(--chip-ink)",
      }}
    >
      {children}
    </span>
  );
}

function seasonTone(season: RaceMap["season"]) {
  if (season === "Fall") return "color-mix(in srgb, var(--coral) 45%, var(--chip-base))";
  if (season === "Summer") return "color-mix(in srgb, var(--mint) 50%, var(--chip-base))";
  if (season === "Winter") return "color-mix(in srgb, #7c9cbf 55%, var(--chip-base))";
  return "color-mix(in srgb, var(--gold) 55%, var(--chip-base))";
}

function TrackRibbon({ layout }: { layout: RaceMap["layout"] }) {
  return (
    <div className="flex h-9 overflow-hidden rounded-full ring-1 ring-[var(--line)]">
      {layout.map((piece, i) => (
        <div
          key={`${piece.label}-${i}`}
          className="grid min-w-0 flex-1 place-items-center px-1 text-center text-[0.6875rem] font-extrabold uppercase leading-tight tracking-wide"
          style={{
            background: piece.kind === "corner" ? "var(--gold)" : "color-mix(in srgb, var(--peach) 55%, var(--chip-base))",
            color: "var(--chip-ink)",
          }}
          title={piece.label}
        >
          <span className="truncate">{piece.label}</span>
        </div>
      ))}
    </div>
  );
}
