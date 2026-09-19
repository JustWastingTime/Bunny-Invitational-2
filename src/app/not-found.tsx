import Link from "next/link";
import { Pennants } from "@/components/site-chrome";

/**
 * Root 404. Renders inside the root layout, so it is outside the (site) group —
 * it brings its own bunting and deliberately no page chrome beyond that.
 */
export default function NotFound() {
  return (
    <>
      <div className="site-grain" aria-hidden />
      <Pennants />
      <main className="page-shell grid flex-1 place-content-center gap-6 py-20">
        <div className="rise">
          <div className="flex flex-wrap items-center gap-3">
            <span className="tote tote-coral">404</span>
            <p className="kicker">Photo finish · no declared result</p>
          </div>
          <h1 className="display-xl mt-4 max-w-[18ch] text-5xl lg:text-7xl">
            This one never left the gate.
          </h1>
          <p className="mt-4 max-w-[52ch] text-[var(--ink-soft)]">
            The page you asked for isn&rsquo;t on the card. Check the schedule, or head back to the meeting.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/"
              className="flag-end lift inline-flex items-center bg-[var(--accent-solid)] py-2.5 pl-5 text-sm font-extrabold uppercase tracking-[0.1em] text-[var(--accent-on-solid)] hover:bg-[var(--coral)]"
            >
              Back to the meeting
            </Link>
            <Link
              href="/schedule"
              className="lift inline-flex items-center bg-[var(--surface-2)] px-5 py-2.5 text-sm font-extrabold uppercase tracking-[0.1em] ring-1 ring-[var(--line-strong)]"
            >
              Order of play
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
