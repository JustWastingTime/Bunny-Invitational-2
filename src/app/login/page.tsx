"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="mx-auto grid max-w-md flex-1 place-content-center gap-4 px-4 py-24 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Staff login</h1>
      <p className="text-[var(--ink-soft)]">
        Discord only, and only IDs listed in <code>DISCORD_STAFF_IDS</code>. Locally you can set <code>DEV_STAFF_BYPASS=true</code>.
      </p>
      <button
        type="button"
        onClick={() => signIn("discord", { callbackUrl: "/staff" })}
        className="rounded-full bg-[var(--coral)] px-5 py-2 text-white"
      >
        Continue with Discord
      </button>
    </div>
  );
}
