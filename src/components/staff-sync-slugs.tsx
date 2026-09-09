"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStaffToast } from "@/components/staff-toast";

export function StaffSyncSlugs() {
  const [busy, setBusy] = useState(false);
  const toast = useStaffToast();
  const router = useRouter();

  async function run() {
    if (busy) return;
    if (
      !window.confirm(
        "Rewrite every team URL from its club code? Old links like /staff/teams/cloud-nine will stop working.",
      )
    ) {
      return;
    }
    setBusy(true);
    toast.saving("Updating team URLs…");
    try {
      const res = await fetch("/api/staff/teams/slugs", { method: "POST" });
      const json = (await res.json()) as {
        error?: string;
        renamed?: { from: string; to: string }[];
      };
      if (!res.ok) {
        toast.error(json.error ?? "Could not update URLs");
        return;
      }
      const n = json.renamed?.length ?? 0;
      toast.saved(n ? `Updated ${n} team URL${n === 1 ? "" : "s"}` : "URLs already matched club codes");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void run()}
      disabled={busy}
      className="rounded-full px-4 py-1.5 text-sm ring-1 ring-[var(--line)] disabled:opacity-50"
    >
      {busy ? "Updating URLs…" : "Sync URLs from club codes"}
    </button>
  );
}
