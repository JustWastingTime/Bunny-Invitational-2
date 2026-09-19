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
                className={`relative px-3 py-1.5 text-sm ${active ? "font-extrabold text-[var(--coral-ink)]" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"}`}
              >
                {link.label}
                {active ? (
                  <span aria-hidden className="absolute inset-x-2 -bottom-0.5 h-[3px] bg-[var(--coral)]" />
                ) : null}
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="rounded-[3px] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.09em] ring-1 ring-[var(--line)]"
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
      <div className="page-shell py-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="display-lg text-2xl">Bunny Invitational 2</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Fan-run, non-commercial, and made by people who yell at horse races.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[var(--ink-soft)] underline decoration-[var(--line-strong)] decoration-dotted underline-offset-4 hover:text-[var(--ink)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-8 border-t-2 border-dashed border-[var(--line-strong)] pt-4 text-xs leading-relaxed text-[var(--ink-soft)]">
          This tournament is a non-commercial, fan-made project and is not affiliated with, authorized, endorsed, or
          sponsored by Cygames, Inc. or the Umamusume: Pretty Derby franchise.
        </p>
      </div>
    </footer>
  );
}

/** Bunting. Decorative only — the <i> elements are standing in for flags. */
export function Pennants({ count = 40 }: { count?: number }) {
  return (
    <div className="pennants" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <i key={i} style={{ ["--i" as string]: i }} />
      ))}
    </div>
  );
}

/** Scrolling race-day strip. Content is rendered twice so the loop is seamless. */
export function Ticker({ items }: { items: string[] }) {
  const run = [...items, ...items];
  return (
    <div className="ticker bg-[var(--tote-bg)] py-1.5 text-[var(--tote-ink)]">
      <div className="ticker-track">
        {run.map((item, i) => (
          <span key={i} className="flex items-center gap-4 px-4 text-xs font-extrabold uppercase tracking-[0.18em]">
            {item}
            <span aria-hidden className="text-[var(--gold)]">
              ◆
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Section header with the track-stripe wash and an optional trailing link. */
export function SectionHeading({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="track-stripes mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-[var(--line)] pb-3">
      <div>
        <h2 className="display-lg text-3xl lg:text-4xl">{title}</h2>
        {children ? <p className="mt-1 max-w-[52ch] text-sm text-[var(--ink-soft)]">{children}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Primary action. Flag-ended so it reads as signage rather than a pill. */
export function ActionButton({
  href,
  children,
  tone = "solid",
}: {
  href: string;
  children: ReactNode;
  tone?: "solid" | "ghost";
}) {
  const base = "inline-flex items-center py-2.5 text-sm font-extrabold uppercase tracking-[0.1em] lift";
  const skin =
    tone === "solid"
      ? "flag-end bg-[var(--accent-solid)] pl-5 text-[var(--accent-on-solid)] hover:bg-[var(--coral)]"
      : "bg-[var(--surface-2)] px-5 text-[var(--ink)] ring-1 ring-[var(--line-strong)] hover:bg-[var(--surface-strong)]";
  return (
    <Link href={href} className={`${base} ${skin}`}>
      {children}
    </Link>
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
    <div
      role="alert"
      className="border-l-4 border-[var(--coral)] bg-[var(--surface)] px-5 py-4 ring-1 ring-[var(--line)]"
    >
      <p className="display-lg text-xl">The {what} is off the board.</p>
      <p className="mt-1 max-w-[58ch] text-sm text-[var(--ink-soft)]">
        The board refreshes on its own every few seconds. Check your connection, or reload the page.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flag-end lift mt-4 inline-flex items-center bg-[var(--accent-solid)] py-2 pl-4 text-sm font-extrabold uppercase tracking-[0.1em] text-[var(--accent-on-solid)] hover:bg-[var(--coral)]"
      >
        Reload
      </button>
    </div>
  );
}

export function Loading({ what }: { what: string }) {
  return (
    <p role="status" className="flex items-center gap-3 text-[var(--ink-soft)]">
      <span aria-hidden className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-4 w-1.5 animate-pulse bg-[var(--coral)]"
            style={{ animationDelay: `${i * 140}ms` }}
          />
        ))}
      </span>
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
    <header className="mb-8 grid gap-3 border-b-2 border-dashed border-[var(--line-strong)] pb-5 lg:grid-cols-[1fr_minmax(16rem,32rem)] lg:items-end">
      <div className="rise">
        {kicker ? <p className="kicker mb-2">{kicker}</p> : null}
        <h1 className="display-xl text-4xl lg:text-6xl">{title}</h1>
      </div>
      {children ? <p className="max-w-[46ch] text-[var(--ink-soft)] lg:text-right">{children}</p> : null}
    </header>
  );
}
