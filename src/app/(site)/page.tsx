"use client";

import Link from "next/link";
import { GroupTable } from "@/components/tournament-ui";
import { MapsGrid } from "@/components/race-maps";
import { ActionButton, DataError, Loading, SectionHeading, Ticker } from "@/components/site-chrome";
import { usePublicData } from "@/components/use-public-data";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  GROUPS,
  PLAY_IN_EVENT_LABEL,
  PLAY_IN_TEAM_COUNT,
  PUBLIC_GROUPS_LIVE,
  PUBLIC_TOURNAMENT_LIVE,
  TEAMS_PER_GROUP,
} from "@/lib/constants";

const MAIN_CLUBS = GROUPS.length * TEAMS_PER_GROUP;
const DISTANCES = CATEGORIES.map((c) => CATEGORY_LABEL[c]);

const MARQUEE = [
  `${MAIN_CLUBS} clubs · ${GROUPS.length} groups`,
  `Play-in ${PLAY_IN_EVENT_LABEL}`,
  DISTANCES.join(" · "),
  "3v3v3 · points decide everything",
  "No affiliation with Cygames",
];

export default function HomePage() {
  const { data, error } = usePublicData();

  return (
    <div className="grid gap-12">
      <section className="grid gap-8">
        <Ticker items={MARQUEE} />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,1fr)] lg:items-end">
          <div className="rise">
            <div className="flex flex-wrap items-center gap-3">
              <p className="kicker">Uma Musume invitational</p>
              <span className="tote tote-coral">Ed. 02</span>
            </div>
            <h1 className="display-xl mt-4 text-[3.5rem] sm:text-7xl lg:text-[6.25rem]">
              Bunny
              <br />
              Invitational 2
            </h1>
          </div>

          <div className="rise" style={{ ["--i" as string]: 1 }}>
            <p className="max-w-[40ch] text-[var(--ink-soft)]">
              Twenty-one clubs, three groups, one trophy. Three umas a side across five distances, then a two-set grand
              final.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ActionButton href="/scoreboard">
                {PUBLIC_TOURNAMENT_LIVE ? "Live scoreboard" : "Open the scoreboard"}
              </ActionButton>
              <ActionButton href="/schedule" tone="ghost">
                Order of play
              </ActionButton>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t-2 border-dashed border-[var(--line-strong)] pt-6 sm:grid-cols-4">
          <FactPlate value={MAIN_CLUBS} label="Clubs on the main stage" />
          <FactPlate value={PLAY_IN_TEAM_COUNT} label="Play-in clubs, one survives" />
          <FactPlate value={CATEGORIES.length} label="Distances in rotation" />
          <FactPlate value={2} label="Sets in the grand final" />
        </dl>
      </section>

      <Podium />

      {PUBLIC_GROUPS_LIVE ? (
        !data ? (
          error ? <DataError what="board" /> : <Loading what="board" />
        ) : (
        <section>
          <SectionHeading
            title="Group tables"
            action={
              <Link
                href="/scoreboard"
                className="text-sm font-extrabold uppercase tracking-[0.1em] text-[var(--coral-ink)] underline decoration-dotted underline-offset-4"
              >
                Full scoreboard →
              </Link>
            }
          >
            Top two go straight to the semis. Third through fifth get a last chance.
          </SectionHeading>
          <div className="grid gap-10 xl:grid-cols-3">
            {data.groups.map((g) => (
              <GroupTable key={g.id} group={g.id} standings={g.standings} />
            ))}
          </div>
        </section>
        )
      ) : (
        <section id="maps">
          <SectionHeading title="The five distances">
            Every group race runs one of these. Venue, going, and how the course turns.
          </SectionHeading>
          <MapsGrid compact />
        </section>
      )}
    </div>
  );
}

const PODIUM = [
  { place: "2", code: "KITA", id: "kita", color: "#b41225", label: "Second", order: "order-2 sm:order-1" },
  { place: "1", code: "SOUP", id: "soup", color: "#67bed9", label: "Winner", order: "order-1 sm:order-2" },
  { place: "3", code: "BUNS", id: "buns", color: "#e73d57", label: "Third", order: "order-3" },
] as const;

function Podium() {
  return (
    <section aria-label="Final standings" className="rise">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Final result</p>
          <h2 className="display-lg mt-2 text-3xl sm:text-4xl">SOUP take the invitational</h2>
        </div>
        <p className="max-w-[28ch] text-sm text-[var(--ink-soft)] sm:text-right">Two-set grand final.</p>
      </div>
      <ol className="grid items-end gap-3 sm:grid-cols-3">
        {PODIUM.map((club) => (
          <li key={club.id} className={club.order}>
            <Link
              href={`/teams/${club.id}`}
              className="group block border-2 border-dashed border-[var(--line-strong)] bg-[var(--surface)] transition-colors hover:border-[var(--ink)]"
            >
              <span className="block h-2" style={{ background: club.color }} />
              <span className={`flex items-end justify-between gap-3 px-4 ${club.place === "1" ? "py-7 sm:py-9" : club.place === "2" ? "py-5" : "py-4"}`}>
                <span>
                  <span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    {club.label}
                  </span>
                  <span className={`display-xl mt-1 block ${club.place === "1" ? "text-5xl sm:text-6xl" : "text-4xl"}`}>
                    {club.code}
                  </span>
                </span>
                <span className={`tote ${club.place === "1" ? "tote-gold text-lg" : "text-base"}`}>{club.place}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FactPlate({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="flex items-baseline gap-3">
        <span className="tote tote-gold text-lg">{value}</span>
        <span className="max-w-[18ch] text-sm leading-tight text-[var(--ink-soft)]">{label}</span>
      </dd>
    </div>
  );
}
