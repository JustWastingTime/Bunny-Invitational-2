import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/no-store";
import { getTazunaCatalog } from "@/lib/tazuna-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await getTazunaCatalog();
    const rarity: Record<string, string> = {};
    for (const skill of catalog.skills) rarity[skill.name] = skill.rarity || "normal";
    return NextResponse.json({ rarity }, { headers: noStoreHeaders() });
  } catch {
    return NextResponse.json({ rarity: {} }, { headers: noStoreHeaders() });
  }
}
