"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CATEGORIES, CATEGORY_LABEL, PUBLIC_BOARDS_LIVE } from "@/lib/constants";
import { ComingSoon, DataError, Loading, PageTitle } from "@/components/site-chrome";
import { UmaRosterCard } from "@/components/uma-roster-card";
import { usePlayInData } from "@/components/use-play-in-data";
import { finishKey } from "@/lib/uma-finish";

export default function PlayInRostersPage() {
  const { data, error } = usePlayInData();
  const [teamId, setTeamId] = useState("");

  useEffect(() => {
    if (!data?.teams.length) return;
    setTeamId((current) => {
      if (current && data.teams.some((team) => team.id === current)) return current;
      const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (data.teams.some((team) => team.id === hash)) return hash;
      return data.teams[0].id;
    });
  }, [data]);

  if (!PUBLIC_BOARDS_LIVE) {
    return (
      <ComingSoon kicker="Qualifier" title="Play-in">
        The play-in is off the public site for now.
      </ComingSoon>
    );
  }
  if (!data) return error ? <DataError what="play-in field" /> : <Loading what="play-in field" />;

  const selected = data.teams.find((team) => team.id === teamId) ?? data.teams[0];

  function selectTeam(id: string) {
    setTeamId(id);
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <div>
      <PageTitle kicker="Qualifier" title="Play-in umas">
        Seven clubs in the play-in. Their umas are up here while the main field is still locking in. Oshi and popularity
        on this page count only inside the play-in.
      </PageTitle>

      {data.teams.length === 0 || !selected ? (
        <p className="rounded-2xl bg-[var(--surface)] px-5 py-4 text-[var(--ink-soft)]">No play-in teams yet.</p>
      ) : (
        <>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Play-in teams" className="flex flex-wrap gap-2">
              {data.teams.map((team) => {
                const active = team.id === selected.id;
                return (
                  <button
                    key={team.id}
                    type="button"
                    role="tab"
                    id={`play-in-tab-${team.id}`}
                    aria-selected={active}
                    aria-controls="play-in-panel"
                    onClick={() => selectTeam(team.id)}
                    className={`inline-flex items-center gap-2 px-3 py-2 text-sm ${
                      active
                        ? "slant bg-[var(--accent-solid)] text-[var(--accent-on-solid)]"
                        : "bg-[var(--surface)] text-[var(--ink)] ring-1 ring-[var(--line)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <span className="h-3 w-3 shrink-0" style={{ background: team.color }} />
                    <span className="font-extrabold">{team.shortName || team.name}</span>
                  </button>
                );
              })}
            </div>
            <Link href="/play-in/stats" className="text-sm font-semibold text-[var(--coral-ink)] underline">
              Play-in stats
            </Link>
          </div>

          <section
            role="tabpanel"
            id="play-in-panel"
            aria-labelledby={`play-in-tab-${selected.id}`}
            className="grid gap-8"
          >
            <header className="flex items-end gap-3 border-b border-[var(--line)] pb-3">
              <span className="h-8 w-8 shrink-0" style={{ background: selected.color }} />
              <div>
                <h2 className="display-lg text-3xl leading-none">{selected.name}</h2>
                {selected.tagline ? <p className="mt-1 text-sm text-[var(--ink-soft)]">{selected.tagline}</p> : null}
              </div>
            </header>

            {CATEGORIES.map((cat) => (
              <div key={cat}>
                <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl">{CATEGORY_LABEL[cat]}</h3>
                <div className="grid gap-4 lg:grid-cols-3">
                  {selected.roster
                    .filter((uma) => uma.category === cat)
                    .sort((a, b) => a.slot - b.slot)
                    .map((uma) => (
                      <UmaRosterCard
                        key={`${uma.category}-${uma.slot}`}
                        uma={uma}
                        finish={data.finishes[finishKey(selected.id, uma.category, uma.slot)]}
                        skillRarity={data.skillRarity}
                      />
                    ))}
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
