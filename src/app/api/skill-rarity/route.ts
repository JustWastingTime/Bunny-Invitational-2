import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/no-store";
import { plainSkillName } from "@/lib/skill-name";
import { getTazunaCatalog } from "@/lib/tazuna-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await getTazunaCatalog();
    const rarity: Record<string, string> = {};
    for (const skill of catalog.skills) {
      const label = plainSkillName(skill.name);
      rarity[label] = skill.rarity || "normal";
    }
    return NextResponse.json({ rarity }, { headers: noStoreHeaders() });
  } catch {
    return NextResponse.json({ rarity: {} }, { headers: noStoreHeaders() });
  }
}
