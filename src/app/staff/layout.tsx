import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { devBypass, getSession, isStaffSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!isStaffSession(session)) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-[color-mix(in_srgb,var(--paper)_90%,var(--lift))]">
        <div className="page-shell flex flex-wrap items-center gap-3 py-3">
          <Link href="/staff" className="font-[family-name:var(--font-display)] text-lg">
            Staff desk
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link className="border-b border-[var(--line-strong)] pb-0.5" href="/staff/groups">
              Groups
            </Link>
            <Link className="border-b border-[var(--line-strong)] pb-0.5" href="/staff/scores">
              Scores
            </Link>
            <Link className="border-b border-[var(--line-strong)] pb-0.5" href="/staff/overlay">
              Overlay
            </Link>
            <Link href="/">Public site</Link>
            <Link href="/obs">OBS view</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            {devBypass() ? (
              <span className="text-xs text-[var(--ink-soft)]">Dev bypass on</span>
            ) : (
              <span className="text-xs text-[var(--ink-soft)]">{session?.user?.name}</span>
            )}
          </div>
        </div>
      </header>
      <main className="page-shell flex-1 py-6">{children}</main>
    </div>
  );
}
