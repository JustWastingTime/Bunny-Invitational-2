"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { PUBLIC_TOURNAMENT_LIVE } from "@/lib/constants";
import { ThemeToggle } from "@/components/theme-toggle";

const MENU_ID = "site-menu";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/scoreboard", label: "Scoreboard" },
  { href: "/teams", label: "Teams", live: true },
  { href: "/stats", label: "Stats", live: true },
  { href: "/rules", label: "Rules" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = LINKS.filter((link) => PUBLIC_TOURNAMENT_LIVE || !("live" in link && link.live));

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 bg-[color-mix(in_srgb,var(--paper)_86%,var(--lift))]/90 backdrop-blur-md">
      <div className="page-shell flex items-center justify-between gap-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 text-[var(--ink)]">
          <img
            src="/favicon.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
          <span className="hidden font-[family-name:var(--font-display)] text-xl leading-none sm:inline">
            Bunny Invitational 2
          </span>
          <span className="sr-only sm:hidden">Bunny Invitational 2</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`px-3 py-1.5 text-sm ${active ? "font-extrabold text-[var(--coral-ink)]" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"}`}
              >
                {link.label}
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={MENU_ID}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      {open ? (
        <div id={MENU_ID} className="grid gap-1 px-4 pb-3 md:hidden">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`rounded-xl px-3 py-2 ${
                  active
                    ? "bg-[var(--surface-2)] font-extrabold text-[var(--coral-ink)]"
                    : "bg-[var(--surface)] text-[var(--ink)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)] px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-[var(--chip-ink)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--live-dot)]" />
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
      <p className="rounded-2xl bg-[var(--surface)] px-5 py-4 text-[var(--ink-soft)]">
        This page opens when the tournament goes live.
      </p>
    </div>
  );
}

export function DataError({ what }: { what: string }) {
  return (
    <div role="alert" className="rounded-2xl bg-[var(--surface)] px-5 py-4">
      <p className="font-semibold text-[var(--ink)]">Unable to load the {what}.</p>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">
        The board refreshes on its own every few seconds. Check your connection, or reload the page.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-3 rounded-full bg-[var(--accent-solid)] px-4 py-1.5 text-sm font-semibold text-[var(--accent-on-solid)]"
      >
        Reload
      </button>
    </div>
  );
}

export function Loading({ what }: { what: string }) {
  return (
    <p role="status" className="text-[var(--ink-soft)]">
      Loading the {what}…
    </p>
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
        <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-balance lg:text-5xl">{title}</h1>
      </div>
      {children ? <p className="text-[var(--ink-soft)] lg:text-right">{children}</p> : null}
    </header>
  );
}
