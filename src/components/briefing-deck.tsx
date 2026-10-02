"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CATEGORY_LABEL, RACE_MAPS, TOURNAMENT_NAME, type Category, type RaceMap } from "@/lib/constants";
import { courseProfile } from "@/lib/course-profiles";
import { spriteFileName, spriteLocalPath } from "@/lib/sprites";
import { COURSE_COLORS, CourseMap } from "@/components/course-map";
import {
  BRIEF_POINTS,
  briefSlideLabel,
  signed,
  type BriefClub,
  type BriefPool,
  type BriefRunner,
  type BriefSlide,
  type BriefUma,
} from "@/lib/briefing-slides";
import { HoldScreen } from "@/components/hold-screen";
import "./briefing-deck.css";

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
  if (slide.kind === "soon") {
    return (
      <article className="brief" aria-label={briefSlideLabel(slide)}>
        <HoldScreen title="STARTING SOON" tag="The field is almost here" />
      </article>
    );
  }
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
    case "soon":
      return "Stream briefing";
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
    case "costume":
      return "Penalized variant";
    case "costumes":
      return slide.tone === "pair" ? "Oshi +1" : slide.tone === "unique" ? "Oshi +2" : "Meta penalty";
  }
}

function bodyFor(slide: BriefSlide) {
  switch (slide.kind) {
    case "soon":
      return null;
    case "title":
      return <TitleSlide pool={slide.pool} groups={slide.groups} />;
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
    case "costume":
      return <CostumeSlide slide={slide} />;
    case "costumes":
      return <CostumesSlide slide={slide} />;
  }
}

function TitleSlide({ pool, groups }: { pool: BriefPool; groups: { id: string; label: string; teams: BriefClub[] }[] }) {
  const playin = pool === "playin";
  const clubs = groups[0]?.teams ?? [];
  return (
    <div className="brief-title brief-welcome">
      <h1>{playin ? "Play-in" : "Main tournament"}</h1>
      <p className="brief-lede">
        {playin
          ? "Seven clubs. Popularity is counted only inside this pool, across every distance."
          : "Three groups of seven. Popularity is counted across the main field, on every distance."}
      </p>
      {playin ? (
        clubs.length ? (
          <div className="brief-clubs">
            {clubs.map((team) => (
              <ClubCard key={team.id} team={team} />
            ))}
          </div>
        ) : (
          <p className="brief-note">Play-in clubs are not on the board yet.</p>
        )
      ) : (
        <div className="brief-groups">
          {groups.map((group) => (
            <section key={group.id} className="brief-group">
              <h2>{group.label}</h2>
              {group.teams.length ? (
                <ol>
                  {group.teams.map((team) => (
                    <li key={team.id}>
                      <ClubRow team={team} />
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="brief-note">No clubs yet.</p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ClubCard({ team }: { team: BriefClub }) {
  return (
    <article className="brief-club-card">
      <i style={{ background: team.color }} />
      <div>
        <strong>{team.short}</strong>
        {team.name !== team.short ? <span>{team.name}</span> : null}
      </div>
    </article>
  );
}

function ClubRow({ team }: { team: BriefClub }) {
  return (
    <span className="brief-club">
      <i style={{ background: team.color }} />
      <span>
        <strong>{team.short}</strong>
        {team.name !== team.short ? <em>{team.name}</em> : null}
      </span>
    </span>
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
            <CourseFrame category={map.category} compact />
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
      <ul className="brief-facts">
        {facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
      <div className="brief-legend">
        <span><i style={{ background: COURSE_COLORS.flat }} /> Flat</span>
        <span><i style={{ background: COURSE_COLORS.uphill }} /> Uphill</span>
        <span><i style={{ background: COURSE_COLORS.downhill }} /> Downhill</span>
        <span><i style={{ background: COURSE_COLORS.straight }} /> Straight</span>
        <span><i style={{ background: COURSE_COLORS.corner }} /> Corner</span>
      </div>
      <CourseFrame category={map.category} />
    </div>
  );
}

function CourseFrame({ category, compact = false }: { category: Category; compact?: boolean }) {
  const profile = courseProfile(category);
  if (!profile) return null;
  return (
    <div className={compact ? "brief-course is-compact" : "brief-course"}>
      <CourseMap profile={profile} compact={compact} />
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

function CostumeSlide({ slide }: { slide: Extract<BriefSlide, { kind: "costume" }> }) {
  const uma = slide.uma;
  return (
    <div className="brief-stack">
      <div className="brief-costume-head">
        <Sprite spriteId={uma.spriteId} name={uma.name} />
        <div>
          <h1>{uma.name}</h1>
          <Badges uma={uma} />
          <p className="brief-lede">{uma.count} {uma.count === 1 ? "trainer" : "trainers"} in this pool</p>
        </div>
      </div>
      {uma.runners.length <= 8 ? (
      <table className="brief-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>Distance</th>
            <th>Trainer</th>
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
            </tr>
          ))}
        </tbody>
      </table>
      ) : (
        <div className="brief-chips">
          {uma.runners.slice(0, 28).map((runner, i) => (
            <span key={`${runner.short}-${runner.distance}-${runner.trainer}-${i}`}>
              <i className="brief-dot" style={{ background: runner.color }} />
              {runner.short} · {runner.distance} · {runner.trainer}
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
            <Sprite spriteId={uma.spriteId} name={uma.name} />
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
    <p className="brief-runner">
      <i className="brief-dot" style={{ background: runner.color }} />
      {runner.short} · {runner.distance} · {runner.trainer}
    </p>
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

function Sprite({ spriteId, name }: { spriteId: string; name: string }) {
  const remote = spriteFileName(spriteId);
  const local = spriteLocalPath(spriteId);
  const [src, setSrc] = useState(remote);
  if (!src) return <span className="brief-fallback">{name.slice(0, 1)}</span>;
  return (
    <img
      src={src}
      alt=""
      className="brief-sprite"
      onError={() => setSrc((current) => (local && current !== local ? local : null))}
    />
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

