"use client";

import Link from "next/link";
import { FieldStats } from "@/components/field-stats";
import { ComingSoon, DataError, Loading, PageTitle } from "@/components/site-chrome";
import { usePlayInData } from "@/components/use-play-in-data";
import { PUBLIC_BOARDS_LIVE } from "@/lib/constants";

export default function PlayInStatsPage() {
  const { data, error } = usePlayInData();
  if (!PUBLIC_BOARDS_LIVE) {
    return (
      <ComingSoon kicker="Play-in" title="Stats">
        The play-in is off the public site for now.
      </ComingSoon>
    );
  }
  if (!data) return error ? <DataError what="play-in stats" /> : <Loading what="play-in stats" />;

  return (
    <div className="grid gap-8">
      <div>
        <Link href="/play-in" className="text-sm text-[var(--coral-ink)]">
          ← Play-in umas
        </Link>
        <PageTitle kicker="Play-in" title="Stats">
          Picks, skills, and form inside the play-in. The main field has its own count.
        </PageTitle>
      </div>
      <FieldStats stats={data.stats} />
    </div>
  );
}
