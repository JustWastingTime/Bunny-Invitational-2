import { OWNER_DISCORD_ID } from "./constants";
import { prisma } from "./prisma";

export type StaffMemberRow = {
  discordId: string;
  label: string;
};

function envStaffIds() {
  return (process.env.DISCORD_STAFF_IDS ?? "")
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isDiscordId(value: string) {
  return /^\d{15,22}$/.test(value);
}

/** Owner plus everyone saved on the settings page. Seeds once from DISCORD_STAFF_IDS when the table is empty. */
export async function listStaffMembers(): Promise<StaffMemberRow[]> {
  const rows = await prisma.staffMember.findMany({ orderBy: { createdAt: "asc" } });
  if (rows.length === 0) {
    const seed = [...new Set([OWNER_DISCORD_ID, ...envStaffIds()])];
    for (const discordId of seed) {
      await prisma.staffMember.upsert({
        where: { discordId },
        create: { discordId, label: discordId === OWNER_DISCORD_ID ? "Owner" : "" },
        update: {},
      });
    }
    return seed.map((discordId) => ({ discordId, label: discordId === OWNER_DISCORD_ID ? "Owner" : "" }));
  }
  if (!rows.some((row) => row.discordId === OWNER_DISCORD_ID)) {
    await prisma.staffMember.create({ data: { discordId: OWNER_DISCORD_ID, label: "Owner" } });
    rows.unshift({ discordId: OWNER_DISCORD_ID, label: "Owner", createdAt: new Date() });
  }
  return rows.map((row) => ({ discordId: row.discordId, label: row.label }));
}

export async function staffDiscordIds(): Promise<string[]> {
  try {
    const members = await listStaffMembers();
    return [...new Set([OWNER_DISCORD_ID, ...members.map((member) => member.discordId)])];
  } catch {
    return [...new Set([OWNER_DISCORD_ID, ...envStaffIds()])];
  }
}

export async function addStaffMember(discordId: string, label: string) {
  await prisma.staffMember.upsert({
    where: { discordId },
    create: { discordId, label },
    update: { label },
  });
}

export async function removeStaffMember(discordId: string) {
  if (discordId === OWNER_DISCORD_ID) return;
  await prisma.staffMember.delete({ where: { discordId } }).catch(() => undefined);
}
