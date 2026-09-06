import { PageTitle } from "@/components/site-chrome";
import { MapsGrid } from "@/components/race-maps";

export default function MapsPage() {
  return (
    <div className="grid gap-8">
      <PageTitle kicker="The courses" title="Maps">
        Five distances, one locked track and condition set for each. Same maps for play-in and the main stage.
      </PageTitle>
      <MapsGrid />
    </div>
  );
}
