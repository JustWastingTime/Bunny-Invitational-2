"use client";

import Link from "next/link";
import { FieldStats } from "@/components/field-stats";
import { PageTitle, ComingSoon, DataError, Loading } from "@/components/site-chrome";
import { usePublicData } from "@/components/use-public-data";
import { PUBLIC_FIELD_LIVE, PUBLIC_TOURNAMENT_LIVE } from "@/lib/constants";

export default function StatsPage() {
  const { data, error } = usePublicData(8000);
  if (!PUBLIC_FIELD_LIVE && !PUBLIC_TOURNAMENT_LIVE) {
    return (
      <ComingSoon kicker="The meta" title="Stats">
        Uma and skill stats stay hidden until clubs submit.
      </ComingSoon>
    );
  }
  if (!data) return error ? <DataError what="stats" /> : <Loading what="stats" />;

  return (
    <div className="grid gap-8">
      <Link href="/teams" className="text-sm text-[var(--coral-ink)]">
        ← Main field teams
      </Link>
      <PageTitle kicker="The meta" title="Stats">
        Picks, skills, and power across the 21 main-field clubs. Play-in counts stay on their own page.
      </PageTitle>
      <FieldStats stats={data.stats} teams={data.teams} />
    </div>
  );
}
