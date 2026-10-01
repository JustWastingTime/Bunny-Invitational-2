import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { OWNER_DISCORD_ID } from "@/lib/constants";
import { addStaffMember, isDiscordId, listStaffMembers, removeStaffMember } from "@/lib/staff-access";
import { getTazunaCatalog } from "@/lib/tazuna-catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const gate = await requireOwner();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });
  try {
    const members = await listStaffMembers();
    return NextResponse.json({ ownerId: OWNER_DISCORD_ID, members });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load staff";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireOwner();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    discordId?: string;
    label?: string;
  } | null;
  const action = body?.action;

  try {
    if (action === "add") {
      const discordId = (body?.discordId ?? "").trim();
      const label = (body?.label ?? "").trim().slice(0, 80);
      if (!isDiscordId(discordId)) {
        return NextResponse.json({ error: "Enter a Discord user id." }, { status: 400 });
      }
      await addStaffMember(discordId, label);
    } else if (action === "remove") {
      const discordId = (body?.discordId ?? "").trim();
      if (discordId === OWNER_DISCORD_ID) {
        return NextResponse.json({ error: "The owner stays on the desk." }, { status: 400 });
      }
      await removeStaffMember(discordId);
    } else if (action === "refresh") {
      const catalog = await getTazunaCatalog(true);
      const members = await listStaffMembers();
      return NextResponse.json({
        ownerId: OWNER_DISCORD_ID,
        members,
        catalog: {
          asOf: catalog.asOf,
          commitSha: catalog.commitSha,
          umas: catalog.umas.length,
          skills: catalog.skills.length,
        },
      });
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    const members = await listStaffMembers();
    return NextResponse.json({ ownerId: OWNER_DISCORD_ID, members });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Settings update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
