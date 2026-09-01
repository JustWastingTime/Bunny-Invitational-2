import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { getTazunaCatalog } from "@/lib/tazuna-catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const url = new URL(request.url);
  const asOf = url.searchParams.get("asOf");
  const refresh = url.searchParams.get("refresh") === "1";

  try {
    const catalog = await getTazunaCatalog(asOf, refresh);
    return NextResponse.json(catalog);
  } catch (err) {
    const message = err instanceof Error ? err.message : "catalog failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
