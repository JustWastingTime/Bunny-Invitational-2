"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CATEGORY_LABEL, RACE_MAPS, TOURNAMENT_NAME, type Category, type RaceMap } from "@/lib/constants";
import {
  BRIEF_POINTS,
  briefSlideLabel,
  signed,
  type BriefPool,
  type BriefRunner,
  type BriefSlide,
  type BriefStats,
  type BriefUma,
} from "@/lib/briefing-slides";
import "./briefing-deck.css";

const STATS: { key: keyof BriefStats; label: string }[] = [
  { key: "speed", label: "SPD" },
  { key: "stamina", label: "STA" },
  { key: "power", label: "POW" },
  { key: "guts", label: "GUT" },
  { key: "wisdom", label: "WIT" },
];

export function BriefingFrame({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.45);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => setScale(el.clientWidth / 1920);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative aspect-video overflow-hidden rounded-2xl bg-[#140910] ring-1 ring-[var(--line)]" aria-label={label}>
      <div className="pointer-events-none absolute top-0 left-0 h-[1080px] w-[1920px] origin-top-left" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

export function BriefingDeck({ slide, index, total, pool }: { slide: BriefSlide; index: number; total: number; pool: BriefPool }) {
  return (
    <article className="brief" aria-label={briefSlideLabel(slide)}>
      <div className="brief-wash" />
      <div className="brief-inner">
        <header className="brief-top">
          <p className="brief-kicker">{kickerFor(slide)}</p>
          <p className="brief-index">
            {index + 1} / {total}
          </p>
        </header>
        <div className="brief-body">{bodyFor(slide)}</div>
        <footer className="brief-foot">
          <span>{pool === "playin" ? "Play-in pool" : "Main field"}</span>
          <span>{TOURNAMENT_NAME}</span>
        </footer>
      </div>
    </article>
  );
}

function kickerFor(slide: BriefSlide) {
  switch (slide.kind) {
    case "title":
      return "Stream briefing";
    case "maps":
      return "Courses";
    case "map":
      return CATEGORY_LABEL[slide.category];
    case "places":
      return "Scoring";
    case "oshi":
      return "Oshi buff";
    case "penalty":
      return "Meta penalty";
    case "field":
      return "This pool";
    case "costume":
      return "Penalized variant";
    case "costumes":
      return slide.tone === "pair" ? "Oshi +1" : slide.tone === "unique" ? "Oshi +2" : "Meta penalty";
  }
}

function bodyFor(slide: BriefSlide) {
  switch (slide.kind) {
    case "title":
      return <TitleSlide pool={slide.pool} />;
    case "maps":
      return <MapsSlide />;
    case "map":
      return <MapSlide category={slide.category} />;
    case "places":
      return <PlacesSlide />;
    case "oshi":
      return <OshiSlide uniqueCount={slide.uniqueCount} pairCount={slide.pairCount} />;
    case "penalty":
      return <PenaltySlide penalized={slide.penalized} />;
    case "field":
      return <FieldSlide slide={slide} />;
    case "costume":
      return <CostumeSlide slide={slide} />;
    case "costumes":
      return <CostumesSlide slide={slide} />;
  }
}

function TitleSlide({ pool }: { pool: BriefPool }) {
  return (
    <div className="brief-title">
      <h1>{pool === "playin" ? "Play-in" : "Main tournament"}</h1>
      <p className="brief-lede">
        {pool === "playin"
          ? "Popularity is counted only among the play-in clubs, across every distance."
          : "Popularity is counted only among the main-field clubs, across every distance."}
      </p>
      <div className="brief-tiles">
        <article className="brief-tile">
          <span>Place</span>
          <strong>{BRIEF_POINTS.place[1]}</strong>
          <em>1st, then 5, 3, 2, and 1</em>
        </article>
        <article className="brief-tile">
          <span>Oshi</span>
          <strong>{signed(BRIEF_POINTS.unique)}</strong>
          <em>only you bring it, in the top 5. {signed(BRIEF_POINTS.pair)} if one other trainer does</em>
        </article>
        <article className="brief-tile is-hot">
          <span>Meta</span>
          <strong>{signed(BRIEF_POINTS.first)}</strong>
          <em>most-used variant. {signed(BRIEF_POINTS.second)} for 2nd and 3rd</em>
        </article>
      </div>
    </div>
  );
}

function MapsSlide() {
  return (
    <div className="brief-stack">
      <h1>Five courses</h1>
      <p className="brief-lede">Every match runs all five distances on these maps.</p>
      <div className="brief-maps">
        {RACE_MAPS.map((map) => (
          <article key={map.category} className="brief-map-card">
            <p className="brief-kicker">{CATEGORY_LABEL[map.category]}</p>
            <h2>
              {map.venue}
              <br />
              {map.distanceM}m
            </h2>
            <p>{mapLine(map)}</p>
            <Track map={map} />
          </article>
        ))}
      </div>
    </div>
  );
}

function MapSlide({ category }: { category: Category }) {
  const map = RACE_MAPS.find((row) => row.category === category);
  if (!map) return <h1>{CATEGORY_LABEL[category]}</h1>;
  const facts = [
    map.course ? `${map.course} course` : "Open course",
    map.direction === "clockwise" ? "Clockwise" : "Counterclockwise",
    map.surface === "dirt" ? "Dirt" : "Turf",
    map.season,
    map.weather,
    `${map.going} going`,
  ];
  return (
    <div className="brief-map-detail">
      <div>
        <h1>
          {map.venue} {map.distanceM}m
        </h1>
        <ul className="brief-facts">
          {facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <div className="brief-legend">
          <span>
            <i className="is-straight" /> Straight
          </span>
          <span>
            <i className="is-corner" /> Corner
          </span>
        </div>
      </div>
      <Track map={map} labeled />
    </div>
  );
}

function PlacesSlide() {
  return (
    <div className="brief-stack">
      <h1>Place points</h1>
      <p className="brief-lede">Top 5 score. 6th through 9th get 0 for the finish.</p>
      <div className="brief-places">
        {[1, 2, 3, 4, 5].map((place) => (
          <article key={place} className="brief-place">
            <span>{ordinal(place)}</span>
            <strong>{BRIEF_POINTS.place[place]}</strong>
            <em>{BRIEF_POINTS.place[place] === 1 ? "point" : "points"}</em>
          </article>
        ))}
      </div>
    </div>
  );
}

function OshiSlide({ uniqueCount, pairCount }: { uniqueCount: number; pairCount: number }) {
  return (
    <div className="brief-stack">
      <h1>Oshi buff</h1>
      <p className="brief-lede">Paid only when that variant finishes in the top 5.</p>
      <div className="brief-split">
        <article className="brief-tile">
          <span>Only you</span>
          <strong>{signed(BRIEF_POINTS.unique)}</strong>
          <em>{countPhrase(uniqueCount, "variant")} in this pool</em>
        </article>
        <article className="brief-tile">
          <span>You and one other</span>
          <strong>{signed(BRIEF_POINTS.pair)}</strong>
          <em>{countPhrase(pairCount, "variant")} in this pool</em>
        </article>
      </div>
    </div>
  );
}

function PenaltySlide({ penalized }: { penalized: number }) {
  return (
    <div className="brief-stack">
      <h1>Meta penalty</h1>
      <p className="brief-lede">
        The most-used variant is {signed(BRIEF_POINTS.first)}, even outside the top 5. Second and third are{" "}
        {signed(BRIEF_POINTS.second)}. Ties share it. A total can go below 0.
      </p>
      <div className="brief-split">
        <article className="brief-tile is-hot">
          <span>Most used</span>
          <strong>{signed(BRIEF_POINTS.first)}</strong>
          <em>Rank 1, and at least two trainers brought it</em>
        </article>
        <article className="brief-tile is-hot">
          <span>2nd and 3rd</span>
          <strong>{signed(BRIEF_POINTS.second)}</strong>
          <em>Same rule, shared when the counts tie</em>
        </article>
      </div>
      <p className="brief-note">
        {penalized === 0
          ? "No variant in this pool is popular enough to be penalized."
          : `${countPhrase(penalized, "variant")} ${penalized === 1 ? "takes" : "take"} a penalty. The next slides name them.`}
      </p>
    </div>
  );
}

function FieldSlide({ slide }: { slide: Extract<BriefSlide, { kind: "field" }> }) {
  return (
    <div className="brief-stack">
      <h1>Pool snapshot</h1>
      <p className="brief-lede">Live from the submitted variants. It updates when a roster changes.</p>
      <div className="brief-nums">
        <article className="brief-num">
          <span>Variants</span>
          <strong>{slide.costumes}</strong>
          <em>with a costume set</em>
        </article>
        <article className="brief-num">
          <span>Oshi {signed(BRIEF_POINTS.unique)}</span>
          <strong>{slide.uniqueCount}</strong>
          <em>only one trainer</em>
        </article>
        <article className="brief-num">
          <span>Oshi {signed(BRIEF_POINTS.pair)}</span>
          <strong>{slide.pairCount}</strong>
          <em>exactly two trainers</em>
        </article>
        <article className={`brief-num ${slide.penalized ? "is-hot" : ""}`}>
          <span>Penalized</span>
          <strong>{slide.penalized}</strong>
          <em>meta rank 1–3</em>
        </article>
      </div>
      <div className="brief-top-list">
        {slide.top.length ? (
          slide.top.map((row, i) => (
            <p key={`${row.name}-${i}`}>
              {row.name} · {row.count} {row.penalty ? `· ${signed(row.penalty)}` : "· no penalty"}
            </p>
          ))
        ) : (
          <p>No variants submitted in this pool yet.</p>
        )}
      </div>
    </div>
  );
}

function CostumeSlide({ slide }: { slide: Extract<BriefSlide, { kind: "costume" }> }) {
  const uma = slide.uma;
  return (
    <div className="brief-stack">
      <div className="brief-costume-head">
        <Sprite src={uma.spritePath} name={uma.name} />
        <div>
          <h1>{uma.name}</h1>
          <Badges uma={uma} />
          <p className="brief-lede">{uma.count} {uma.count === 1 ? "trainer" : "trainers"} in this pool</p>
        </div>
      </div>
      {uma.runners.length <= 6 ? (
      <table className="brief-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>Distance</th>
            <th>Trainer</th>
            {STATS.map((stat) => (
              <th key={stat.key}>{stat.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {uma.runners.map((runner, i) => (
            <tr key={`${runner.team}-${runner.distance}-${runner.trainer}-${i}`}>
              <td>
                <i className="brief-dot" style={{ background: runner.color }} />
                {runner.short}
              </td>
              <td>{runner.distance}</td>
              <td>{runner.trainer}</td>
              {STATS.map((stat) => (
                <td key={stat.key}>{statText(runner.stats[stat.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      ) : (
        <div className="brief-chips">
          {uma.runners.slice(0, 28).map((runner, i) => (
            <span key={`${runner.short}-${runner.distance}-${runner.trainer}-${i}`}>
              <i className="brief-dot" style={{ background: runner.color }} />
              {runner.short} · {runner.distance}
            </span>
          ))}
          {uma.runners.length > 28 ? <span>+{uma.runners.length - 28} more</span> : null}
        </div>
      )}
    </div>
  );
}

function CostumesSlide({ slide }: { slide: Extract<BriefSlide, { kind: "costumes" }> }) {
  return (
    <div className="brief-stack">
      <h1>{slide.title}</h1>
      <div className={`brief-grid ${slide.tone === "unique" ? "brief-grid-unique" : "brief-grid-pair"}`}>
        {slide.umas.map((uma) => (
          <article key={uma.spriteId} className="brief-card">
            <Sprite src={uma.spritePath} name={uma.name} />
            <div className="brief-card-copy">
              <h2>{uma.name}</h2>
              <Badges uma={uma} />
              <p className="brief-runner">{uma.count} {uma.count === 1 ? "trainer" : "trainers"}</p>
              {uma.runners.length <= 2
                ? uma.runners.map((runner, i) => <RunnerLine key={`${runner.team}-${runner.trainer}-${i}`} runner={runner} />)
                : (
                  <p className="brief-runner">
                    {uma.runners.slice(0, 4).map((runner) => runner.short).join(" · ")}
                    {uma.runners.length > 4 ? ` +${uma.runners.length - 4}` : ""}
                  </p>
                )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RunnerLine({ runner }: { runner: BriefRunner }) {
  return (
    <>
      <p className="brief-runner">
        <i className="brief-dot" style={{ background: runner.color }} />
        {runner.short} · {runner.distance} · {runner.trainer}
      </p>
      <p className="brief-statline">
        {STATS.map((stat) => (
          <span key={stat.key}>
            <i>{stat.label}</i>
            {statText(runner.stats[stat.key])}
          </span>
        ))}
      </p>
    </>
  );
}

function Badges({ uma }: { uma: BriefUma }) {
  return (
    <div className="brief-badges">
      {uma.oshi ? <span className="brief-badge brief-badge-oshi">Oshi {signed(uma.oshi)}</span> : null}
      {uma.penalty ? <span className="brief-badge brief-badge-pen">Meta {signed(uma.penalty)}</span> : null}
    </div>
  );
}

function Sprite({ src, name }: { src: string | null; name: string }) {
  const [ok, setOk] = useState(true);
  if (!src || !ok) return <span className="brief-fallback">{name.slice(0, 1)}</span>;
  return <img src={src} alt="" className="brief-sprite" onError={() => setOk(false)} />;
}

function Track({ map, labeled = false }: { map: RaceMap; labeled?: boolean }) {
  return (
    <div className={labeled ? "brief-track brief-track-tall" : "brief-track"} aria-hidden>
      {map.layout.map((piece, i) => (
        <div key={`${piece.label}-${i}`} className={piece.kind === "corner" ? "is-corner" : "is-straight"}>
          {labeled ? <span>{piece.label}</span> : null}
        </div>
      ))}
    </div>
  );
}

function mapLine(map: RaceMap) {
  const direction = map.direction === "clockwise" ? "Clockwise" : "Counterclockwise";
  return [map.course, direction, map.surface === "dirt" ? "Dirt" : "Turf", map.season, map.weather, map.going]
    .filter(Boolean)
    .join(" · ");
}

function ordinal(n: number) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

function countPhrase(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function statText(value: number) {
  return value > 0 ? String(value) : "—";
}
