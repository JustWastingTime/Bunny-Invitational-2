"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { PUBLIC_TOURNAMENT_LIVE } from "@/lib/constants";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/maps", label: "Maps" },
  { href: "/scoreboard", label: "Scoreboard" },
  { href: "/teams", label: "Teams", live: true },
  { href: "/stats", label: "Stats", live: true },
  { href: "/rules", label: "Rules" },
];

export function SiteHeader({ staff }: { staff?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = LINKS.filter((link) => PUBLIC_TOURNAMENT_LIVE || !("live" in link && link.live));

  return (
    <header className="sticky top-0 z-40 bg-[color-mix(in_srgb,var(--paper)_86%,white)]/90 backdrop-blur-md">
      <div className="page-shell flex items-center justify-between gap-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 text-[var(--ink)]">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--coral)] text-xs font-extrabold text-white">
            BI
          </span>
          <span className="hidden font-[family-name:var(--font-display)] text-xl leading-none sm:inline">
            Bunny Invitational 2
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-sm ${active ? "font-extrabold text-[var(--coral-ink)]" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"}`}
              >
                {link.label}
              </Link>
            );
          })}
          {staff ? (
            <Link href="/staff" className="ml-1 rounded-full bg-[var(--gold)] px-3 py-1.5 text-sm font-semibold">
              Staff
            </Link>
          ) : null}
        </nav>
        <button
          type="button"
          className="rounded-full bg-white/70 px-3 py-1.5 text-sm md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Menu
        </button>
      </div>
      {open ? (
        <div className="grid gap-1 px-4 pb-3 md:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="py-2">
              {link.label}
            </Link>
          ))}
          {staff ? (
            <Link href="/staff" onClick={() => setOpen(false)} className="py-2">
              Staff
            </Link>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto">
      <div className="page-shell flex flex-wrap items-center justify-between gap-2 py-6 text-sm text-[var(--ink-soft)]">
        <span>Bunny Invitational 2</span>
        <span>3v3v3 · 21 teams · two days</span>
      </div>
    </footer>
  );
}

export function LivePill({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)] px-2.5 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-[var(--ink)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral)]" />
      {label}
    </span>
  );
}

export function ComingSoon({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <PageTitle kicker={kicker} title={title}>
        {children}
      </PageTitle>
      <p className="rounded-2xl bg-white/55 px-5 py-4 text-[var(--ink-soft)]">
        This page opens when the tournament goes live.
      </p>
    </div>
  );
}

export function PageTitle({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 grid gap-3 lg:grid-cols-[1fr_minmax(16rem,32rem)] lg:items-end">
      <div>
        {kicker ? <p className="kicker mb-2">{kicker}</p> : null}
        <h1 className="font-[family-name:var(--font-display)] text-4xl leading-none lg:text-5xl">{title}</h1>
      </div>
      {children ? <p className="text-[var(--ink-soft)] lg:text-right">{children}</p> : null}
    </header>
  );
}
