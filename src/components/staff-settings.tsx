"use client";

import { useEffect, useState } from "react";
import { OWNER_DISCORD_ID } from "@/lib/constants";
import { useStaffToast } from "@/components/staff-toast";

type Member = { discordId: string; label: string };
type CatalogInfo = { asOf: string; commitSha: string | null; umas: number; skills: number };

export function SettingsDesk() {
  const toast = useStaffToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [discordId, setDiscordId] = useState("");
  const [label, setLabel] = useState("");
  const [catalog, setCatalog] = useState<CatalogInfo | null>(null);
  const [busy, setBusy] = useState<"add" | "refresh" | string | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/staff/settings")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load settings");
        return json as { members?: Member[] };
      })
      .then((json) => {
        if (!cancelled) setMembers(json.members ?? []);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function post(body: Record<string, string>, key: string) {
    setBusy(key);
    try {
      const res = await fetch("/api/staff/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      setMembers(json.members ?? []);
      if (json.catalog) setCatalog(json.catalog);
      return json as { catalog?: CatalogInfo };
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">Desk access and the live Tazuna catalog.</p>
        {loadError ? <p className="mt-2 text-sm text-[var(--coral-ink)]">{loadError}</p> : null}
      </div>

      <section className="grid gap-3 rounded-3xl bg-[var(--surface-strong)] p-4 ring-1 ring-[var(--line)]">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Staff access</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          Discord user ids that can open the staff desk. Your account stays on the list.
        </p>
        <ul className="grid gap-2">
          {members.map((member) => (
            <li key={member.discordId} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--paper)] px-3 py-2">
              <span className="min-w-0">
                <span className="block font-extrabold">{member.label || "Staff"}</span>
                <span className="block font-mono text-xs text-[var(--ink-soft)]">{member.discordId}</span>
              </span>
              {member.discordId === OWNER_DISCORD_ID ? (
                <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Owner</span>
              ) : (
                <button
                  type="button"
                  className="rounded-full px-3 py-1 text-sm ring-1 ring-[var(--line)]"
                  disabled={busy !== null}
                  onClick={() => {
                    post({ action: "remove", discordId: member.discordId }, member.discordId).catch((err: Error) => toast.error(err.message));
                  }}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            post({ action: "add", discordId, label }, "add")
              .then(() => {
                setDiscordId("");
                setLabel("");
                toast.saved("Staff access saved.");
              })
              .catch((err: Error) => toast.error(err.message));
          }}
        >
          <label className="grid gap-1 text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">
            Discord user id
            <input
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-mono text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
              value={discordId}
              onChange={(event) => setDiscordId(event.target.value)}
              inputMode="numeric"
              placeholder="217274197553053696"
              required
            />
          </label>
          <label className="grid gap-1 text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">
            Name
            <input
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Optional"
            />
          </label>
          <button type="submit" className="min-h-11 rounded-full bg-[var(--gold)] px-4 py-2" disabled={busy !== null}>
            {busy === "add" ? "Saving…" : "Add"}
          </button>
        </form>
      </section>

      <section className="grid gap-3 rounded-3xl bg-[var(--surface-strong)] p-4 ring-1 ring-[var(--line)]">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Tazuna catalog</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          The uma editor and skill colors use the latest Tazuna lists. Refresh after a game update so new skills show up in search.
        </p>
        {catalog ? (
          <p className="text-sm">
            {catalog.umas} umas · {catalog.skills} skills
            {catalog.commitSha ? <span className="text-[var(--ink-soft)]"> · {catalog.commitSha.slice(0, 7)}</span> : null}
          </p>
        ) : null}
        <button
          type="button"
          className="w-fit min-h-11 rounded-full bg-[var(--coral)] px-4 py-2 text-white"
          disabled={busy !== null}
          onClick={() => {
            post({ action: "refresh" }, "refresh")
              .then((json) => toast.saved(`Catalog refreshed. ${json.catalog?.skills ?? 0} skills.`))
              .catch((err: Error) => toast.error(err.message));
          }}
        >
          {busy === "refresh" ? "Refreshing…" : "Refresh Tazuna data"}
        </button>
      </section>
    </div>
  );
}
