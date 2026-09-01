"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CATEGORIES, CATEGORY_LABEL, STYLE_LABEL } from "@/lib/constants";
import { defaultGate } from "@/lib/overlay-gates";
import type { GroupStandingRow, PublicMatch, PublicPayload, PublicTeam, PublicUma } from "@/lib/types";

type OverlayPayload = {
  overlay: PublicPayload["overlay"];
  match: PublicMatch | null;
  teams: PublicTeam[];
  groups: PublicPayload["groups"];
  grandFinal: PublicPayload["grandFinal"];
};

export default function ObsPage() {
  const [data, setData] = useState<OverlayPayload | null>(null);
  const [shown, setShown] = useState<{
    view: string;
    category: string;
    matchId: string;
    focus: string;
  } | null>(null);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    let stop = false;
    async function tick() {
      const res = await fetch("/api/overlay", { cache: "no-store" });
      if (!res.ok || stop) return;
      setData(await res.json());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  const viewKey = data
    ? `${data.overlay.view}|${data.overlay.activeCategory || "sprint"}|${data.match?.id ?? ""}|${data.overlay.focus ? `${data.overlay.focus.teamId}:${data.overlay.focus.slot}` : ""}`
    : "";

  useEffect(() => {
    if (!viewKey) return;
    const [view, category, matchId, focus] = viewKey.split("|");
    if (!matchId) return;
    const nextShown = { view, category, matchId, focus: focus || "" };
    const current = shownRef.current;
    if (!current) {
      setShown(nextShown);
      setPhase("in");
      return;
    }
    if (current.view === view && current.category === category && current.matchId === matchId && current.focus === (focus || "")) {
      return;
    }
    setPhase("out");
    const t = window.setTimeout(() => {
      setShown(nextShown);
      setPhase("in");
    }, 380);
    return () => window.clearTimeout(t);
  }, [viewKey]);

  if (!data) {
    return <div className="obs-root obs-hidden" />;
  }

  if (!data.overlay.visible) {
    return <div className="obs-root obs-hidden" />;
  }

  if (!data.match || !shown) {
    return (
      <div className="obs-root">
        <div className="mu">
          <header className="mu-top">
            <h1>Waiting for a match…</h1>
          </header>
          <div className="mu-board" />
          <footer className="mu-bot">Bunny Invitational 2</footer>
        </div>
      </div>
    );
  }

  const liveMatch = data.match;
  const view = shown.view;
  const cat = shown.category;
  const shownFocus = shown.focus.includes(":")
    ? { teamId: shown.focus.slice(0, shown.focus.lastIndexOf(":")), slot: Number(shown.focus.slice(shown.focus.lastIndexOf(":") + 1)) }
    : null;

  const wrap = (child: ReactNode) => (
    <div className={phase === "out" ? "obs-view-out" : "obs-view-in"}>{child}</div>
  );

  if (view === "matchup" && shownFocus && Number.isInteger(shownFocus.slot)) {
    return (
      <div className="obs-root">
        {wrap(
          <UmaSpotlight
            match={liveMatch}
            teams={data.teams}
            category={cat}
            focus={shownFocus}
          />,
        )}
      </div>
    );
  }

  return (
    <div className="obs-root">
      {view === "matchup"
        ? wrap(<Matchup match={liveMatch} teams={data.teams} category={cat} />)
        : view === "race"
          ? wrap(
              <RaceOverlay
                match={liveMatch}
                teams={data.teams}
                category={cat}
                gates={data.overlay.gates ?? []}
              />,
            )
          : view === "groups"
            ? wrap(<GroupTableOverlay match={liveMatch} groups={data.groups ?? []} />)
            : wrap(<Scoreboard match={liveMatch} category={cat} />)}
    </div>
  );
}

function Matchup({
  match,
  teams,
  category,
}: {
  match: PublicMatch;
  teams: PublicTeam[];
  category: string;
}) {
  return (
    <div className="mu">
      <header className="mu-top">
        <h1>{match.label}</h1>
        <p>{CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL] ?? category}</p>
      </header>
      <div className="mu-body">
        {match.teams.map((t, teamIndex) => {
          const team = teams.find((x) => x.id === t.teamId);
          const umas = team?.roster.filter((u) => u.category === category).sort((a, b) => a.slot - b.slot) ?? [];
          const racers = umas.length ? umas : placeholderUmas();
          const photo = team?.backgroundPath;
          const watermark = photo ? null : racers.find((u) => u.spritePath)?.spritePath;
          return (
            <section
              key={t.slot}
              className={`mu-panel mu-panel-${teamIndex}`}
              style={{ ["--team" as string]: t.color }}
            >
              <div className={`mu-fill${photo ? " mu-fill-photo" : ""}`}>
                <div className="mu-drift">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className="mu-photo" />
                  ) : watermark ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={watermark} alt="" className="mu-watermark" />
                  ) : null}
                  <div className="mu-tint" />
                </div>
                <div className="mu-content">
                  <div className="mu-side">
                    <h2 className="mu-name">{t.name}</h2>
                    {team?.tagline ? <p className="mu-tag">{team.tagline}</p> : null}
                  </div>
                  <div className="mu-stack">
                    {racers.slice(0, 3).map((u, umaIndex) => (
                      <div
                        key={u.slot ?? umaIndex}
                        className="mu-racer"
                        style={{
                          animationDelay: `${920 + teamIndex * 140 + umaIndex * 100}ms`,
                        }}
                      >
                        {u.spritePath ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.spritePath} alt="" className="mu-sprite" />
                        ) : (
                          <div className="mu-sprite" />
                        )}
                        <div className="mu-plate">
                          <p className="mu-player">{u.trainer || "TBD"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <footer className="mu-bot">Bunny Invitational 2</footer>
    </div>
  );
}

const STYLE_SHORT: Record<string, string> = {
  front: "F",
  pace: "P",
  late: "L",
  end: "E",
};

function RaceOverlay({
  match,
  teams,
  category,
  gates,
}: {
  match: PublicMatch;
  teams: PublicTeam[];
  category: string;
  gates: { teamId: string; slot: number; gate: number }[];
}) {
  return (
    <div className="race">
      <header className="race-top">
        <h1>{match.label}</h1>
        <p>{CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL] ?? category}</p>
      </header>
      <footer className="race-panel">
        {match.teams.map((t, teamIndex) => {
          const team = teams.find((x) => x.id === t.teamId);
          const umas = team?.roster.filter((u) => u.category === category).sort((a, b) => a.slot - b.slot) ?? [];
          const racers = umas.length ? umas : placeholderUmas();
          return (
            <section key={t.slot} className="race-col">
              <h2>{t.name}</h2>
              <div className="race-entries">
                {racers.slice(0, 3).map((u, umaIndex) => {
                  const assigned = t.teamId
                    ? gates.find((g) => g.teamId === t.teamId && g.slot === u.slot)?.gate
                    : undefined;
                  const gate = assigned ?? defaultGate(teamIndex, u.slot ?? umaIndex);
                  const styleKey = (u.style ?? "").toLowerCase();
                  return (
                    <div
                      key={u.slot ?? umaIndex}
                      className="race-row"
                      style={{ animationDelay: `${160 + teamIndex * 80 + umaIndex * 80}ms` }}
                    >
                      <div className="race-portrait">
                        {u.spritePath ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.spritePath} alt="" />
                        ) : null}
                      </div>
                      <div className="race-info">
                        <p className="race-uma">{u.umaName || "TBD"}</p>
                        <p className="race-trainer">{u.trainer || "TBD"}</p>
                      </div>
                      <p className="race-style" title={u.styleLabel ?? STYLE_LABEL[styleKey] ?? ""}>
                        {STYLE_SHORT[styleKey] ?? "—"}
                      </p>
                      <div className="race-gate-wrap">
                        <span className="race-gate-label">Gate</span>
                        <span className={`race-gate race-gate-${gate}`}>{gate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </footer>
    </div>
  );
}

function GroupTableOverlay({
  match,
  groups,
}: {
  match: PublicMatch;
  groups: { id: string; standings: GroupStandingRow[] }[];
}) {
  const current = match.group ? groups.filter((g) => g.id === match.group) : groups;
  const tables = current.length ? current : groups;
  return (
    <div className="mu">
      <header className="mu-top">
        <h1>{match.group ? `Group ${match.group}` : "Group standings"}</h1>
        <p>{match.label}</p>
      </header>
      <div className="mu-board">
        <div className={`obs-board obs-groups ${tables.length > 1 ? "obs-groups-all" : ""}`}>
          {tables.map((g) => (
            <section key={g.id}>
              <h2>Group {g.id}</h2>
              <div className="obs-table-wrap">
                <table className="obs-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Team</th>
                      <th className="obs-tot">Pts</th>
                      <th>W</th>
                      <th>1st</th>
                      <th>GP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.standings.map((row, i) => (
                      <tr key={row.teamId} style={{ animationDelay: `${i * 80}ms` }}>
                        <td>{row.rank}</td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              width: 14,
                              height: 14,
                              borderRadius: 99,
                              marginRight: 10,
                              background: row.color,
                            }}
                          />
                          {row.name}
                        </td>
                        <td className="obs-tot">{row.points}</td>
                        <td>{row.wins}</td>
                        <td>{row.firsts}</td>
                        <td>{row.matchesPlayed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>
      <footer className="mu-bot">Bunny Invitational 2</footer>
    </div>
  );
}

function UmaSpotlight({
  match,
  teams,
  category,
  focus,
}: {
  match: PublicMatch;
  teams: PublicTeam[];
  category: string;
  focus: { teamId: string; slot: number };
}) {
  const team = teams.find((t) => t.id === focus.teamId);
  const matchTeam = match.teams.find((t) => t.teamId === focus.teamId);
  const uma = team?.roster.find((u) => u.category === category && u.slot === focus.slot);
  const color = matchTeam?.color ?? team?.color ?? "#e07a5f";
  return (
    <div className="mu uma-spot" style={{ ["--team" as string]: color }}>
      <header className="mu-top">
        <h1>{uma?.umaName || "Uma"}</h1>
        <p>
          {match.label} · {CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL] ?? category}
        </p>
      </header>
      <div className="uma-spot-body">
        <div className="uma-spot-art">
          {uma?.spritePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={uma.spritePath} alt="" />
          ) : (
            <div className="uma-spot-empty">no art</div>
          )}
        </div>
        <div className="uma-spot-card">
          <p className="uma-spot-team">{matchTeam?.name ?? team?.name ?? "TBD"}</p>
          <p className="uma-spot-trainer">{uma?.trainer || "TBD"}</p>
          <p className="uma-spot-meta">
            {uma?.rating || "—"} · {uma?.styleLabel || "—"}
            {uma?.isUnique ? " · Unique" : ""}
            {uma?.popularityRank && uma.pickCount > 1 ? ` · Popular #${uma.popularityRank}` : ""}
          </p>
          <dl className="uma-spot-apts">
            <div>
              <dt>Surface</dt>
              <dd>{uma?.aptitudes.terrain || "—"}</dd>
            </div>
            <div>
              <dt>Distance</dt>
              <dd>{uma?.aptitudes.distance || "—"}</dd>
            </div>
            <div>
              <dt>Style</dt>
              <dd>{uma?.aptitudes.style || "—"}</dd>
            </div>
          </dl>
          <dl className="uma-spot-stats">
            {(["speed", "stamina", "power", "guts", "wisdom"] as const).map((stat) => (
              <div key={stat}>
                <dt>{stat}</dt>
                <dd>{uma?.stats[stat] || "—"}</dd>
              </div>
            ))}
          </dl>
          {uma?.skills.length ? <p className="uma-spot-skills">{uma.skills.join(" · ")}</p> : null}
        </div>
      </div>
      <footer className="mu-bot">Bunny Invitational 2</footer>
    </div>
  );
}

function placeholderUmas(): PublicUma[] {
  return [0, 1, 2].map((slot) => ({
    category: "sprint",
    slot,
    trainer: "",
    umaName: "TBD",
    spriteId: "",
    spritePath: null,
    rating: null,
    style: null,
    styleLabel: null,
    aptitudes: { terrain: null, distance: null, style: null },
    stats: { speed: 0, stamina: 0, power: 0, guts: 0, wisdom: 0 },
    skills: [],
    isUnique: false,
    popularityRank: null,
    pickCount: 0,
  }));
}

function Scoreboard({ match, category }: { match: PublicMatch; category: string }) {
  return (
    <div className="mu">
      <header className="mu-top">
        <h1>{match.label}</h1>
        <p>{CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL] ?? category}</p>
      </header>
      <div className="mu-board">
        <Board match={match} category={category} />
      </div>
      <footer className="mu-bot">Bunny Invitational 2</footer>
    </div>
  );
}

function Board({ match, category }: { match: PublicMatch; category: string }) {
  const race = match.races.find((r) => r.category === category);
  const places = (race?.placements ?? []).filter((p) => p.place <= 5);

  return (
    <div className="obs-board">
      <section>
        <h2>{match.stage === "gf" ? "Set total" : "Match total"}</h2>
        <div className="obs-table-wrap">
          <table className="obs-table">
            <thead>
              <tr>
                <th>Team</th>
                {CATEGORIES.map((c) => (
                  <th key={c} className={c === category ? "obs-cat-now" : ""}>
                    {CATEGORY_LABEL[c]}
                  </th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {match.teams.map((team, i) => {
                const byCat = Object.fromEntries(
                  CATEGORIES.map((c) => [c, teamRacePoints(match, team.teamId, c)]),
                );
                const total = CATEGORIES.reduce((sum, c) => sum + byCat[c], 0);
                return (
                  <tr key={team.slot} style={{ animationDelay: `${i * 110}ms` }}>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          width: 14,
                          height: 14,
                          borderRadius: 99,
                          marginRight: 10,
                          background: team.color,
                        }}
                      />
                      {team.name}
                    </td>
                    {CATEGORIES.map((c) => (
                      <td key={c} className={c === category ? "obs-cat-now" : ""}>
                        {byCat[c] || "—"}
                      </td>
                    ))}
                    <td className="obs-tot">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="obs-race">
        <h2>This race</h2>
        <div className="obs-places">
          {places.map((p, i) => (
            <div
              key={p.place}
              className={`obs-place obs-rise${p.place === 1 ? " obs-place-win" : ""}`}
              style={{ animationDelay: `${360 + i * 140}ms` }}
            >
              {p.spritePath ? (
                <Image src={p.spritePath} alt="" width={64} height={64} className="obs-place-sprite" />
              ) : (
                <div className="obs-place-sprite" />
              )}
              <span className="obs-place-rank">{p.place}</span>
              <div className="obs-place-name">
                {p.trainer || p.teamName}
                <div className="obs-place-team">{p.teamName}</div>
              </div>
              <div className="obs-score">
                <span className="obs-score-base">+{p.base}</span>
                {p.penalty ? <span className="obs-score-mod">{p.penalty}</span> : null}
                {p.uniqueBonus ? <span className="obs-score-bonus">+{p.uniqueBonus}</span> : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function teamRacePoints(match: PublicMatch, teamId: string | null, category: string) {
  if (!teamId) return 0;
  const race = match.races.find((r) => r.category === category);
  return (race?.placements ?? []).filter((p) => p.teamId === teamId).reduce((sum, p) => sum + p.net, 0);
}
