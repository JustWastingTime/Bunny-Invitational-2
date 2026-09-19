"use client";

import Link from "next/link";
import { GroupTable } from "@/components/tournament-ui";
import { usePublicData } from "@/components/use-public-data";

export default function ScoresPage() {
  // Read-only now. Polls slower than the entry screens on purpose: nothing here
  // writes, and every poll is a full payload read.
  const { data, error } = usePublicData(5000, "staff");

  if (!data) return <p>{error ?? "Loading standings…"}</p>;

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="display-lg text-2xl">Standings</h1>
        <p className="text-sm text-[var(--ink-soft)]">
          Read-only. Race results are entered on the{" "}
          <Link className="underline" href="/staff/overlay">
            Overlay director
          </Link>
          , next to the gates for the same match.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {data.groups.map((g) => (
          <GroupTable key={g.id} group={g.id} standings={g.standings} />
        ))}
      </div>
      {data.playIn?.standings?.length ? (
        <GroupTable group="Play-in" standings={data.playIn.standings} />
      ) : null}
    </div>
  );
}
