import { CATEGORY_LABEL, RACE_MAPS, type RaceMap } from "@/lib/constants";

export function MapsGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-4 ${compact ? "md:grid-cols-2 xl:grid-cols-5" : "gap-5"}`}>
      {RACE_MAPS.map((map) => (
        <article
          key={map.category}
          className="overflow-hidden rounded-3xl bg-[var(--surface-2)] ring-1 ring-[var(--line)]"
        >
          <div className="flex items-baseline justify-between gap-3 px-5 pt-4">
            <p className="kicker">{CATEGORY_LABEL[map.category]}</p>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">
              {map.surface}
            </p>
          </div>
          <div className="px-5 pb-2 pt-1">
            <h3 className="font-[family-name:var(--font-display)] text-2xl leading-tight">
              {map.venue} {map.distanceM}m
            </h3>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              {[map.course, map.direction].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 px-5 pb-4">
            <Pill tone={seasonTone(map.season)}>{map.season}</Pill>
            <Pill>{map.weather}</Pill>
            <Pill>{map.going}</Pill>
          </div>
          {compact ? null : (
            <div className="px-5 pb-5">
              <TrackRibbon layout={map.layout} />
              <div className="mt-2 flex justify-between text-[0.65rem] font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">
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
      className="rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide"
      style={{
        background: tone ?? "color-mix(in srgb, var(--peach) 70%, #fff4ea)",
        color: "var(--chip-ink)",
      }}
    >
      {children}
    </span>
  );
}

function seasonTone(season: RaceMap["season"]) {
  if (season === "Fall") return "color-mix(in srgb, var(--coral) 45%, #fff4ea)";
  if (season === "Summer") return "color-mix(in srgb, var(--mint) 50%, #fff4ea)";
  if (season === "Winter") return "color-mix(in srgb, #7c9cbf 55%, #fff4ea)";
  return "color-mix(in srgb, var(--gold) 55%, #fff4ea)";
}

function TrackRibbon({ layout }: { layout: RaceMap["layout"] }) {
  return (
    <div className="flex h-9 overflow-hidden rounded-full ring-1 ring-[var(--line)]">
      {layout.map((piece, i) => (
        <div
          key={`${piece.label}-${i}`}
          className="grid min-w-0 flex-1 place-items-center px-1 text-center text-[0.55rem] font-extrabold uppercase leading-tight tracking-wide"
          style={{
            background: piece.kind === "corner" ? "var(--gold)" : "color-mix(in srgb, var(--peach) 55%, #fff4ea)",
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
