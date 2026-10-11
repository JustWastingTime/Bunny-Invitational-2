"use client";

import { PlayerTable } from "@/components/player-table";
import { ComingSoon, DataError, Loading, PageTitle } from "@/components/site-chrome";
import { usePublicData } from "@/components/use-public-data";
import { PUBLIC_FIELD_LIVE, PUBLIC_TOURNAMENT_LIVE } from "@/lib/constants";

export default function PlayersPage() {
  const { data, error } = usePublicData(8000);
  if (!PUBLIC_FIELD_LIVE && !PUBLIC_TOURNAMENT_LIVE) {
    return (
      <ComingSoon kicker="The field" title="Players">
        Player form publishes with the main-field clubs.
      </ComingSoon>
    );
  }
  if (!data) return error ? <DataError what="players" /> : <Loading what="players" />;

  return (
    <div className="grid gap-8">
      <PageTitle kicker="The field" title="Players">
        Points per game for every main-field runner who has raced. Play-in stays off this list.
      </PageTitle>
      <PlayerTable rows={data.stats.playerTable ?? []} />
    </div>
  );
}
