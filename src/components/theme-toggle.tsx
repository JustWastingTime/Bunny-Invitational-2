"use client";

import { useEffect, useState } from "react";

export const THEME_KEY = "bunvi-theme";

export function readStoredTheme(): "light" | "dark" | "system" {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    /* ignore */
  }
  return "system";
}

export function resolveTheme(stored: "light" | "dark" | "system") {
  if (stored === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return stored;
}

export function applyTheme(stored: "light" | "dark" | "system") {
  const dark = resolveTheme(stored) === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

/**
 * A theme flip repaints colour, background and border on nearly every element
 * at once. Without this the transitions all fire together and the swap smears
 * instead of snapping.
 */
function applyThemeInstantly(stored: "light" | "dark" | "system") {
  const style = document.createElement("style");
  style.append(document.createTextNode("*,*::before,*::after{transition:none !important}"));
  document.head.appendChild(style);
  applyTheme(stored);
  // Force a reflow so the suppressed styles are flushed before we restore.
  void document.body.offsetHeight;
  requestAnimationFrame(() => style.remove());
}

export function ThemeToggle() {
  // Null until mounted: the inline bootstrap script has already set the theme
  // on <html>, but the server render can't know which one it picked.
  const [resolved, setResolved] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const sync = () => {
      const current = readStoredTheme();
      const next = resolveTheme(current);
      setResolved(next);
      applyTheme(current);
    };
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const dark = resolved === "dark";

  return (
    <button
      type="button"
      className="grid h-9 w-9 place-items-center text-[var(--ink-soft)] hover:text-[var(--ink)]"
      aria-pressed={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
        localStorage.setItem(THEME_KEY, next);
        setResolved(next);
        applyThemeInstantly(next);
      }}
    >
      {resolved === null ? <span className="h-5 w-5" /> : dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M15.2 2.1a1 1 0 0 1 1.1 1.5 8.2 8.2 0 1 0 4.1 9.3 1 1 0 0 1 1.9.4 10.2 10.2 0 1 1-8.5-12 1 1 0 0 1 1.4.8Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0-5a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 16.5a1 1 0 0 1 1 1V21a1 1 0 1 1-2 0v-1.5a1 1 0 0 1 1-1ZM3 11a1 1 0 0 1 1-1h1.5a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm15.5 0a1 1 0 0 1 1-1H21a1 1 0 1 1 0 2h-1.5a1 1 0 0 1-1-1ZM5.6 5.6a1 1 0 0 1 1.4 0l1.1 1.1a1 1 0 0 1-1.4 1.4L5.6 7a1 1 0 0 1 0-1.4Zm10.3 10.3a1 1 0 0 1 1.4 0l1.1 1.1a1 1 0 1 1-1.4 1.4l-1.1-1.1a1 1 0 0 1 0-1.4ZM18.4 5.6A1 1 0 0 1 18.4 7l-1.1 1.1a1 1 0 0 1-1.4-1.4L17 5.6a1 1 0 0 1 1.4 0ZM7 16.9a1 1 0 0 1 0 1.4l-1.1 1.1a1 1 0 1 1-1.4-1.4l1.1-1.1a1 1 0 0 1 1.4 0Z" />
    </svg>
  );
}
