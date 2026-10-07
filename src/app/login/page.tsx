import { getSession, isStaffSession } from "@/lib/auth";
import { DiscordSignIn, DiscordSignOut } from "./login-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const session = await getSession();
  const signedInId = session?.user?.id;
  const onRoster = await isStaffSession(session);

  return (
    <div className="mx-auto grid max-w-md flex-1 place-content-center gap-4 px-4 py-24 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Staff login</h1>
      {error === "NotStaff" && signedInId && !onRoster ? (
        <p className="text-[var(--ink-soft)]">
          Discord signed in as {session?.user?.name || "this account"}. The user id is{" "}
          <span className="font-mono text-[var(--ink)]">{signedInId}</span>. That id is not on the staff list. Add this
          one on Settings, then open the desk again.
        </p>
      ) : error ? (
        <p className="text-[var(--ink-soft)]">
          Discord did not finish signing in. Stay in a normal browser, on the Discord account that was added, and try
          again.
        </p>
      ) : (
        <p className="text-[var(--ink-soft)]">
          The staff desk is for tournament crew only. Sign in with the Discord account on the staff roster — if yours
          isn’t on it yet, ask an organiser to add you.
        </p>
      )}
      <DiscordSignIn />
      {signedInId ? <DiscordSignOut /> : null}
    </div>
  );
}
