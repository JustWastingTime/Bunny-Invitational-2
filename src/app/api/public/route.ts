import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { buildPublicPayload } from "@/lib/tournament";

export const dynamic = "force-dynamic";

/**
 * Public pages poll this every 3-15s, and every poll rebuilt the whole payload
 * (~700 rows plus standings and stats) straight from Postgres, which is what
 * kept the database awake around the clock. Identical polls inside the TTL now
 * share one build.
 *
 * Only this route is cached. /api/staff/state, /api/staff/placements and the
 * overlay's /api/overlay keep their own uncached paths, so the staff desk and
 * the OBS overlay stay exactly as reactive as they were. Nothing the overlay
 * renders (view, category, gates, focus) comes from here anyway - that rides
 * the 250ms live state on Redis.
 */
const TTL_SECONDS = 3;

const cachedPublicPayload = unstable_cache(() => buildPublicPayload(), ["public-payload"], {
  revalidate: TTL_SECONDS,
});

export async function GET() {
  return NextResponse.json(await cachedPublicPayload());
}
