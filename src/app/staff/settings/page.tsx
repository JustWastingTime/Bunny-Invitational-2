import { redirect } from "next/navigation";
import { canOpenSettings, getSession } from "@/lib/auth";
import { SettingsDesk } from "@/components/staff-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!canOpenSettings(session)) redirect("/staff");
  return <SettingsDesk />;
}
