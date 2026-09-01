"use client";

import { useState } from "react";
import { PageTitle } from "@/components/site-chrome";

type RulesTab = "simple" | "advanced";

export default function RulesPage() {
  const [tab, setTab] = useState<RulesTab>("simple");

  return (
    <div>
      <PageTitle kicker="How this works" title="Rules">
        {tab === "simple"
          ? "Joining, maps, submissions, bans, and scoring."
          : "The full write-up: maps, submissions, brackets, play-ins, and scoring."}
      </PageTitle>

      <div className="mb-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("simple")}
          className={`rounded-full px-4 py-1.5 text-sm ${tab === "simple" ? "bg-[var(--coral)] text-white" : "bg-white/70 text-[var(--ink-soft)]"}`}
        >
          Simplified
        </button>
        <button
          type="button"
          onClick={() => setTab("advanced")}
          className={`rounded-full px-4 py-1.5 text-sm ${tab === "advanced" ? "bg-[var(--coral)] text-white" : "bg-white/70 text-[var(--ink-soft)]"}`}
        >
          Advanced
        </button>
      </div>

      {tab === "simple" ? <SimplifiedRules /> : <AdvancedRules />}
    </div>
  );
}

function SimplifiedRules() {
  return (
    <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
      <section>
        <p className="kicker">1a</p>
        <h2 className="mt-1 mb-3 font-[family-name:var(--font-display)] text-3xl">Joining as a team</h2>
        <ul className="space-y-2 text-[var(--ink-soft)]">
          <li>
            Your team must have 15 <strong className="font-extrabold text-[var(--ink)]">unique</strong> players; 3 on
            sprint, 3 on mile, 3 on medium, 3 on long and 3 on dirt.
          </li>
          <li>
            Each player only builds <strong className="font-extrabold text-[var(--ink)]">one</strong> uma. This uma (and
            its alternate forms) must not be re-used in the team!
          </li>
          <li>Each player will only run in that specific distance!</li>
          <li>
            If your team does not have enough players, you can recruit some free agents or we can help you find another
            team to merge with.
          </li>
        </ul>
      </section>

      <section>
        <p className="kicker">1b</p>
        <h2 className="mt-1 mb-3 font-[family-name:var(--font-display)] text-3xl">Joining as a free player</h2>
        <ul className="space-y-2 text-[var(--ink-soft)]">
          <li>
            If you do not have a team, you can still join us as a{" "}
            <strong className="font-extrabold text-[var(--ink)]">Free Agent</strong>.
          </li>
          <li>
            Free Agents get a recruitment board where they can showcase themselves to be picked up by a team, or we can
            help matchmake you with a team that still needs players.
          </li>
          <li>You only need to build one uma for the entire tournament!</li>
        </ul>
      </section>

      <section>
        <p className="kicker">2</p>
        <h2 className="mt-1 mb-3 font-[family-name:var(--font-display)] text-3xl">Map rolls</h2>
        <ul className="space-y-2 text-[var(--ink-soft)]">
          <li>Maps and their conditions will be rolled live on stream later (date to be announced).</li>
          <li>Each team will have an equal time to build their umas.</li>
          <li>Each team will fight at least 3 times in the group stage, and top 5 teams will advance to the next stage.</li>
        </ul>
      </section>

      <section>
        <p className="kicker">3</p>
        <h2 className="mt-1 mb-3 font-[family-name:var(--font-display)] text-3xl">Submission</h2>
        <ul className="space-y-2 text-[var(--ink-soft)]">
          <li>
            Every team will be pinged to submit their uma screenshot 3 days before tournament starts. Please submit a
            screenshot of your uma in your designated channels given later. You will have 24 hours.
          </li>
          <li>
            After 24 hours of scrutinizing the umas for any illegal skills, you will be pinged again. Please generate 
            and share the practice partner code of the uma you have shared previously.
          </li>
        </ul>
      </section>

      <section>
        <p className="kicker">4</p>
        <h2 className="mt-1 mb-3 font-[family-name:var(--font-display)] text-3xl">Bans</h2>
        <ul className="space-y-2 text-[var(--ink-soft)]">
          <li>
            <strong className="font-extrabold text-[var(--ink)]">No</strong> umas are banned.
          </li>
          <li>
            <strong className="font-extrabold text-[var(--ink)]">All</strong> red skills are banned.
          </li>
          <li>
            Skills that have debuff effects but are not red are allowed. However we are doing practice partner lobbies
            and there are no &quot;teams&quot; here so these skills will also hit your friends.
          </li>
        </ul>
      </section>

      <section>
        <p className="kicker">5</p>
        <h2 className="mt-1 mb-3 font-[family-name:var(--font-display)] text-3xl">Scoring</h2>
        <PlaceTable />
        <ScoringNotes />
      </section>
    </div>
  );
}

function PlaceTable() {
  return (
    <table className="ink-table">
      <thead>
        <tr>
          {["1st", "2nd", "3rd", "4th", "5th"].map((p) => (
            <th key={p} className="text-center">
              {p}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {["8", "5", "3", "2", "1"].map((n) => (
            <td key={n} className="text-center font-[family-name:var(--font-display)] text-2xl">
              {n}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function ScoringNotes() {
  return (
    <ul className="mt-4 space-y-2 text-[var(--ink-soft)]">
      <li>Top 5 of every race are eligible to score place points.</li>
      <li>
        <strong className="font-extrabold text-[var(--ink)]">Meta penalty</strong> — The uma variant with the most usage
        across all maps will get a −2 score (even if they don&apos;t place top 5). The second and third most popular uma
        variant will be penalized by −1. Ties share the penalty.
      </li>
      <li>
        <strong className="font-extrabold text-[var(--ink)]">Oshi buff</strong> — If your uma variant is only run by you
        and no one else, get a +2 when you place top 5. If your uma variant is run by you and only one other person, get
        a +1 when you place top 5.
      </li>
      <li>Places 6–9 get 0 place points, but meta penalty still applies. Totals can go below 0.</li>
    </ul>
  );
}

function When({ children }: { children: string }) {
  return <strong className="whitespace-nowrap font-extrabold text-[var(--ink)]">{children}</strong>;
}

function AdvancedRules() {
  return (
    <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
      <section className="md:col-span-2">
        <p className="kicker">1</p>
        <h2 className="mt-1 mb-3 font-[family-name:var(--font-display)] text-3xl">What you must know</h2>
        <ul className="space-y-2 text-[var(--ink-soft)]">
          <li>
            Similar to Bunny Invitational 1, each team must have{" "}
            <strong className="font-extrabold text-[var(--ink)]">15 different players</strong>; 3 on sprint, 3 on mile, 3
            on medium, 3 on long and 3 on dirt.
          </li>
          <li>
            Each player only builds <strong className="font-extrabold text-[var(--ink)]">1</strong> uma. This uma will be
            rerun multiple times all the way till the end. No rebuilding once submitted.
          </li>
          <li>
            Each player will only run in that specific distance. If you have been designated as the{" "}
            <em>Mile</em> player, then your uma will only run in the specified Mile track.
          </li>
          <li>
            All umas must be unique in their team (alts included). If a player has already run Oguri Cap, no other player
            on the team can run Oguri Cap (original or Christmas).
          </li>
          <li>
            Matches are played in a 3v3v3 format using practice partner lobbies (no teams — the first three in the room
            do not count as a team either).
          </li>
          <li>
            If your team does not have enough players, you can recruit some Free Agents or we can help you find another
            team to merge with. Please have your players filled by <When>Sat 12 Sep 2026, 10:00 PM ICT</When>.
          </li>
          <li>
            If you are a <strong className="font-extrabold text-[var(--ink)]">Free Agent</strong>, showcase in{" "}
            <span className="font-semibold text-[var(--ink)]">#freeagency</span> and find a team. We can also help with
            recommendations.
          </li>
          <li>
            Clubs / networks are limited to 1 official team. Please refer to Play-ins for an additional team entry.
          </li>
        </ul>
      </section>

      <section>
        <p className="kicker">2</p>
        <h2 className="mt-1 mb-3 font-[family-name:var(--font-display)] text-3xl">Maps</h2>
        <ul className="space-y-2 text-[var(--ink-soft)]">
          <li>
            We will wheel-spin the maps and their conditions in the{" "}
            <a className="font-semibold text-[var(--coral-ink)] underline" href="https://discord.gg/UwUaP2Yyqj">
              Discord
            </a>{" "}
            on <When>Sat 12 Sep 2026, 10:30 PM ICT</When>. If teams are filled before this date, we can move it forward
            for extra preparation time.
          </li>
          <li>Team representatives please show up if possible, or send a substitute.</li>
          <li>
            We will wheel-spin 2 maps per distance and <strong className="font-extrabold text-[var(--ink)]">team representatives</strong>{" "}
            will vote which map to do. Only one vote is counted per team. Play-in teams do not have a vote.
          </li>
          <li>
            For Long, one of the map votes is locked to Nakayama 2500m (Sagittarius Cup / CM 20 map), with conditions
            still wheel-spun — so smaller clubs can two-bird-one-stone a player onto that cup.
          </li>
          <li>If a vote ties, we roll a 3rd map and that one is selected instantly.</li>
        </ul>
      </section>

      <section>
        <p className="kicker">3</p>
        <h2 className="mt-1 mb-3 font-[family-name:var(--font-display)] text-3xl">Submission</h2>
        <ul className="space-y-2 text-[var(--ink-soft)]">
          <li>
            All teams will be pinged on <When>Wed 7 Oct 2026, 10:00 PM ICT</When>. Submit your umas as a{" "}
            <strong className="font-extrabold text-[var(--ink)]">new post</strong> in your designated team channel. Refer
            to <span className="font-semibold text-[var(--ink)]">#example</span> for the format. Posts created after the
            deadline may be rejected if they are unfair or break the rules.
          </li>
          <li>
            On <When>Thu 8 Oct 2026, 10:00 PM ICT</When> another ping will ask you to generate practice partner codes for
            the uma you submitted the day before. Please do not send a different uma. Please do not generate the code
            before the ping — these codes <strong className="font-extrabold text-[var(--ink)]">only last 24 hours</strong>.
          </li>
          <li>
            If staff cannot grab your practice partner because you generated it too early, stay on standby to generate a
            second code.
          </li>
          <li>Play-in teams have a different date — see Play-ins.</li>
        </ul>
      </section>

      <section>
        <p className="kicker">4</p>
        <h2 className="mt-1 mb-3 font-[family-name:var(--font-display)] text-3xl">Bans</h2>
        <ul className="space-y-2 text-[var(--ink-soft)]">
          <li>
            <strong className="font-extrabold text-[var(--ink)]">No</strong> umas are banned.
          </li>
          <li>
            <strong className="font-extrabold text-[var(--ink)]">Red</strong> skills are banned.
          </li>
          <li>
            Skills that have a debuff effect but are not red are allowed (for example, <em>Keen Eye</em>,{" "}
            <em>With All My Soul</em>).
          </li>
          <li>
            We use practice partner lobbies — there are no in-game teams, so these skills will also hit your friends.
          </li>
        </ul>
      </section>

      <section>
        <p className="kicker">5</p>
        <h2 className="mt-1 mb-3 font-[family-name:var(--font-display)] text-3xl">Scoring</h2>
        <PlaceTable />
        <ScoringNotes />
      </section>

      <section>
        <p className="kicker">6</p>
        <h2 className="mt-1 mb-3 font-[family-name:var(--font-display)] text-3xl">Brackets</h2>
        <ul className="space-y-2 text-[var(--ink-soft)]">
          <li>
            21 <strong className="font-extrabold text-[var(--ink)]">main teams</strong> split into 3 groups of 7. Each
            team faces every other team in their group once (3 matches per team, 7 matches per group).
          </li>
          <li>
            Top 2 of each group jump to <strong className="font-extrabold text-[var(--ink)]">Semi Finals</strong>. 3rd,
            4th and 5th go to <strong className="font-extrabold text-[var(--ink)]">Last Chance Qualifiers</strong>.
          </li>
          <li>
            Last Chance Qualifiers are reshuffled across groups: A3 vs B4 vs C5, B3 vs C4 vs A5, C3 vs A4 vs B5.
          </li>
          <li>Semis are reshuffled to: A1 vs B2 vs LCQ3, B1 vs C2 vs LCQ1, C1 vs A2 vs LCQ2.</li>
          <li>
            Semi winners go to Grand Finals: a BO2 (two full sets). If the Grand Finals are tied, we play another set.
          </li>
        </ul>
      </section>

      <section>
        <p className="kicker">7</p>
        <h2 className="mt-1 mb-3 font-[family-name:var(--font-display)] text-3xl">Group stage tiebreakers</h2>
        <p className="mb-3 text-[var(--ink-soft)]">Teams in groups are sorted by:</p>
        <ol className="list-decimal space-y-2 pl-5 text-[var(--ink-soft)]">
          <li>Total points</li>
          <li>Races won</li>
          <li>Head-to-head points in the one match those two teams shared</li>
        </ol>
        <p className="mt-3 text-sm text-[var(--ink-soft)]">
          If a group is still too tangled to declare a clear top 5, representatives will break it with something sillier
          — like Jackbox.
        </p>
      </section>

      <section>
        <p className="kicker">8</p>
        <h2 className="mt-1 mb-3 font-[family-name:var(--font-display)] text-3xl">Play-in teams</h2>
        <ul className="space-y-2 text-[var(--ink-soft)]">
          <li>
            Clubs / networks that want a second team do not get a guaranteed group-stage slot. Second teams play a
            smaller stage on <When>Sat 3 Oct 2026, 10:00 PM ICT</When> for the final slot (or two).
          </li>
          <li>Format is still to be decided while we wait on how many teams confirm.</li>
          <li>
            Play-in submission: <When>Thu 1 Oct 2026, 10:00 PM ICT</When>.
          </li>
          <li>
            Teams that make it through may remake / change their umas for the main stage, then follow the main
            submission deadlines above.
          </li>
        </ul>
      </section>
    </div>
  );
}
