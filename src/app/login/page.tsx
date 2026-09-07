"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="mx-auto grid max-w-md flex-1 place-content-center gap-4 px-4 py-24 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Staff login</h1>
      <p className="text-[var(--ink-soft)]">
        The staff desk is for tournament crew only. Sign in with the Discord account on the staff roster — if yours
        isn’t on it yet, ask an organiser to add you.
      </p>
      <button
        type="button"
        onClick={() => signIn("discord", { callbackUrl: "/staff" })}
        className="rounded-full bg-[var(--accent-solid)] px-5 py-2 font-semibold text-[var(--accent-on-solid)]"
      >
        Continue with Discord
      </button>
    </div>
  );
}
