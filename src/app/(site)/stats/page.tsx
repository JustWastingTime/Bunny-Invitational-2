"use client";

import { FieldStats } from "@/components/field-stats";
import { PageTitle, ComingSoon, DataError, Loading } from "@/components/site-chrome";
import { usePublicData } from "@/components/use-public-data";
import { PUBLIC_TOURNAMENT_LIVE } from "@/lib/constants";

export default function StatsPage() {
  const { data, error } = usePublicData(8000);
  if (!PUBLIC_TOURNAMENT_LIVE) {
    return (
      <ComingSoon kicker="The meta" title="Stats">
        Uma and skill stats stay hidden until clubs submit.
      </ComingSoon>
    );
  }
  if (!data) return error ? <DataError what="stats" /> : <Loading what="stats" />;

  return (
    <div className="grid gap-8">
      <PageTitle kicker="The meta" title="Stats">
        Who brought what, who’s popping off, and which skills are everywhere.
      </PageTitle>
      <FieldStats stats={data.stats} />
    </div>
  );
}
