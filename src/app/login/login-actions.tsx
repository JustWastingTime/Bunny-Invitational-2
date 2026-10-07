"use client";

import { signIn, signOut } from "next-auth/react";

export function DiscordSignIn() {
  return (
    <button
      type="button"
      onClick={() => signIn("discord", { callbackUrl: "/staff" })}
      className="rounded-full bg-[var(--accent-solid)] px-5 py-2 font-semibold text-[var(--accent-on-solid)]"
    >
      Continue with Discord
    </button>
  );
}

export function DiscordSignOut() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm font-semibold text-[var(--ink-soft)] underline"
    >
      Sign out
    </button>
  );
}
