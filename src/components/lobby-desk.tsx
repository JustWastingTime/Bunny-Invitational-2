"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mainStageDayLabel } from "@/lib/constants";
import { useStaffToast } from "@/components/staff-toast";
import type { Category } from "@/lib/constants";

type Runner = {
  category: Category;
  slot: number;
  trainer: string;
  umaName: string;
  style: string | null;
};

type BoardTeam = {
  id: string;
  name: string;
  shortName: string;
  color: string;
  runners: Runner[];
};

type BoardMatch = {
  id: string;
  label: string;
  day: number;
  sortOrder: number;
  teams: { slot: number; teamId: string | null }[];
};

type Board = { id: string; label: string; teams: BoardTeam[]; matches: BoardMatch[] };

type Payload = {
  categories: { id: Category; label: string }[];
  boards: Board[];
  done: string[];
};

const STYLE_SHORT: Record<string, string> = {
  front: "Front",
  pace: "Pace",
  late: "Late",
  end: "End",
  runaway: "Front",
};

function codeKey(teamId: string, category: string, slot: number) {
  return `code:${teamId}:${category}:${slot}`;
}

function roomKey(matchId: string, category: string, teamId: string, slot: number) {
  return `room:${matchId}:${category}:${teamId}:${slot}`;
}

function runnerAt(team: BoardTeam | undefined, category: string, slot: number) {
  return team?.runners.find((runner) => runner.category === category && runner.slot === slot);
}

function playerName(runner: Runner | undefined) {
  return runner?.trainer || "Empty";
}

function styleShort(style: string | null | undefined) {
  if (!style) return "";
  return STYLE_SHORT[style] ?? style;
}

function matchTitle(label: string) {
  const found = label.match(/Match\s+(\d+)/i);
  if (found) return `Match ${found[1]}`;
  return label.replace("Grand Final — ", "Final ").replace("Quarter Final", "LCQ").replace("Semi Final", "SF");
}

export function LobbyDesk() {
  const toast = useStaffToast();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState(false);
  const [boardId, setBoardId] = useState("playin");
  const [mode, setMode] = useState<"codes" | "rooms">("codes");
  const [category, setCategory] = useState<Category>("sprint");
  const [openOnly, setOpenOnly] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const pending = useRef(new Map<string, boolean>());

  const applyServer = useCallback((keys: string[]) => {
    const next = new Set(keys);
    for (const [key, value] of pending.current) {
      if (next.has(key) === value) pending.current.delete(key);
      else if (value) next.add(key);
      else next.delete(key);
    }
    setDone(next);
  }, []);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const response = await fetch("/api/staff/lobby", { cache: "no-store" });
        if (!response.ok) throw new Error("load");
        const body = (await response.json()) as Payload;
        if (stop) return;
        setPayload(body);
        applyServer(body.done);
        setError(false);
      } catch {
        if (!stop) setError(true);
      }
    }
    void load();
    const timer = window.setInterval(load, 4000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [applyServer]);

  const board = payload?.boards.find((item) => item.id === boardId) ?? payload?.boards[0];
  const teamsById = useMemo(() => new Map(board?.teams.map((team) => [team.id, team]) ?? []), [board]);

  const isDone = useCallback((key: string) => done.has(key), [done]);

  async function toggle(key: string) {
    const next = !done.has(key);
    pending.current.set(key, next);
    setDone((current) => {
      const copy = new Set(current);
      if (next) copy.add(key);
      else copy.delete(key);
      return copy;
    });
    try {
      const response = await fetch("/api/staff/lobby", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, done: next }),
      });
      if (!response.ok) throw new Error("save");
    } catch {
      pending.current.delete(key);
      setDone((current) => {
        const copy = new Set(current);
        if (next) copy.delete(key);
        else copy.add(key);
        return copy;
      });
      toast.error("Could not save that tick");
    }
  }

  if (!payload || !board) {
    return <p className="text-sm text-[var(--ink-soft)]">{error ? "Could not load the lobby desk." : "Loading lobby desk…"}</p>;
  }

  const categories = payload.categories;
  const codeTotal = board.teams.length * categories.length * 3;
  const codeDone = board.teams.reduce(
    (sum, team) =>
      sum +
      categories.reduce(
        (inner, cat) => inner + [0, 1, 2].filter((slot) => isDone(codeKey(team.id, cat.id, slot))).length,
        0,
      ),
    0,
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Lobby desk</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            {mode === "codes"
              ? `${codeDone}/${codeTotal} codes in. Ticks are shared with the rest of the desk.`
              : "Build each in-game room from the schedule. Tick a runner once they are in the lobby."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Seg on={mode === "codes"} onClick={() => setMode("codes")}>
            Codes
          </Seg>
          <Seg on={mode === "rooms"} onClick={() => setMode("rooms")}>
            Rooms
          </Seg>
          <Seg on={openOnly} onClick={() => setOpenOnly((value) => !value)}>
            {openOnly ? "Showing open" : "Show open"}
          </Seg>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {payload.boards.map((item) => (
          <Seg key={item.id} on={item.id === board.id} onClick={() => setBoardId(item.id)}>
            {item.label}
          </Seg>
        ))}
      </div>

      {board.teams.length === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">No clubs on this board yet.</p>
      ) : mode === "codes" ? (
        <CodeSheet board={board} categories={categories} openOnly={openOnly} isDone={isDone} onToggle={toggle} />
      ) : (
        <RoomSheet
          board={board}
          categories={categories}
          category={category}
          onCategory={setCategory}
          teamsById={teamsById}
          openOnly={openOnly}
          isDone={isDone}
          onToggle={toggle}
        />
      )}
    </div>
  );
}

function Seg({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm font-bold ${
        on
          ? "bg-[var(--accent-solid)] text-[var(--accent-on-solid)]"
          : "bg-[var(--surface-2)] text-[var(--ink-soft)] ring-1 ring-[var(--line)]"
      }`}
    >
      {children}
    </button>
  );
}

function Tick({
  checked,
  label,
  detail,
  onToggle,
}: {
  checked: boolean;
  label: string;
  detail?: string;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-1.5 rounded px-1 py-0.5 ${
        checked ? "text-[var(--ink-soft)]" : "text-[var(--ink)]"
      }`}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--accent-solid)]"
        checked={checked}
        onChange={onToggle}
      />
      <span className="min-w-0 leading-tight">
        <span className={`block truncate text-[0.8rem] font-semibold ${checked ? "line-through decoration-[var(--line-strong)]" : ""}`}>
          {label}
        </span>
        {detail ? <span className="block truncate text-[0.68rem] text-[var(--ink-soft)]">{detail}</span> : null}
      </span>
    </label>
  );
}

function CodeSheet({
  board,
  categories,
  openOnly,
  isDone,
  onToggle,
}: {
  board: Board;
  categories: { id: Category; label: string }[];
  openOnly: boolean;
  isDone: (key: string) => boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-[var(--surface)] ring-1 ring-[var(--line)]">
      <div
        className="grid min-w-[52rem]"
        style={{ gridTemplateColumns: "6.25rem repeat(5, minmax(8.5rem, 1fr))" }}
      >
        <div className="sticky left-0 z-10 border-b border-[var(--line)] bg-[var(--surface-strong)] px-2 py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-[var(--ink-soft)]">
          Club
        </div>
        {categories.map((cat) => {
          const total = board.teams.length * 3;
          const got = board.teams.reduce(
            (sum, team) => sum + [0, 1, 2].filter((slot) => isDone(codeKey(team.id, cat.id, slot))).length,
            0,
          );
          return (
            <div key={cat.id} className="border-b border-l border-[var(--line)] px-2 py-2">
              <div className="text-[0.68rem] font-extrabold uppercase tracking-[0.08em]">{cat.label}</div>
              <div className={`text-[0.68rem] font-bold ${got === total ? "text-[var(--mint)]" : "text-[var(--coral-ink)]"}`}>
                {got}/{total}
              </div>
            </div>
          );
        })}
        {board.teams.map((team) => (
          <TeamCodeRow key={team.id} team={team} categories={categories} openOnly={openOnly} isDone={isDone} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

function TeamCodeRow({
  team,
  categories,
  openOnly,
  isDone,
  onToggle,
}: {
  team: BoardTeam;
  categories: { id: Category; label: string }[];
  openOnly: boolean;
  isDone: (key: string) => boolean;
  onToggle: (key: string) => void;
}) {
  const teamDone = categories.every((cat) => [0, 1, 2].every((slot) => isDone(codeKey(team.id, cat.id, slot))));
  if (openOnly && teamDone) return null;
  return (
    <>
      <div
        className="sticky left-0 z-10 flex items-center gap-2 border-t border-[var(--line)] px-2 py-1.5"
        style={{ background: `color-mix(in srgb, ${team.color} 22%, var(--surface-strong))` }}
      >
        <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: team.color }} />
        <span className="truncate text-sm font-extrabold uppercase tracking-wide">{team.shortName}</span>
      </div>
      {categories.map((cat) => (
        <div key={cat.id} className="border-l border-t border-[var(--line)] px-1 py-1">
          {[0, 1, 2].map((slot) => {
            const key = codeKey(team.id, cat.id, slot);
            const checked = isDone(key);
            if (openOnly && checked) return null;
            const runner = runnerAt(team, cat.id, slot);
            return (
              <Tick
                key={slot}
                checked={checked}
                label={playerName(runner)}
                onToggle={() => onToggle(key)}
              />
            );
          })}
        </div>
      ))}
    </>
  );
}

function RoomSheet({
  board,
  categories,
  category,
  onCategory,
  teamsById,
  openOnly,
  isDone,
  onToggle,
}: {
  board: Board;
  categories: { id: Category; label: string }[];
  category: Category;
  onCategory: (category: Category) => void;
  teamsById: Map<string, BoardTeam>;
  openOnly: boolean;
  isDone: (key: string) => boolean;
  onToggle: (key: string) => void;
}) {
  const days = [...new Set(board.matches.map((match) => match.day))];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const slots = board.matches.flatMap((match) =>
            match.teams.filter((slot) => slot.teamId).flatMap((slot) => [0, 1, 2].map((index) => roomKey(match.id, cat.id, slot.teamId as string, index))),
          );
          const got = slots.filter((key) => isDone(key)).length;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={cat.id === category}
              onClick={() => onCategory(cat.id)}
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                cat.id === category
                  ? "bg-[var(--accent-solid)] text-[var(--accent-on-solid)]"
                  : "bg-[var(--surface-2)] text-[var(--ink-soft)] ring-1 ring-[var(--line)]"
              }`}
            >
              {cat.label} {got}/{slots.length || 0}
            </button>
          );
        })}
      </div>
      {board.matches.length === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">No matches on this board yet.</p>
      ) : (
        days.map((day) => {
          const matches = board.matches.filter((match) => match.day === day);
          return (
            <section key={day}>
              {board.id !== "playin" ? (
                <p className="mb-2 text-sm font-extrabold">
                  Day {day}
                  <span className="ml-2 font-semibold text-[var(--ink-soft)]">{mainStageDayLabel(day)}</span>
                </p>
              ) : null}
              <div className="flex gap-3 overflow-x-auto pb-1">
                {matches.map((match) => (
                  <MatchColumn
                    key={match.id}
                    match={match}
                    category={category}
                    teamsById={teamsById}
                    openOnly={openOnly}
                    isDone={isDone}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function MatchColumn({
  match,
  category,
  teamsById,
  openOnly,
  isDone,
  onToggle,
}: {
  match: BoardMatch;
  category: Category;
  teamsById: Map<string, BoardTeam>;
  openOnly: boolean;
  isDone: (key: string) => boolean;
  onToggle: (key: string) => void;
}) {
  const keys = match.teams.flatMap((slot) =>
    slot.teamId ? [0, 1, 2].map((index) => roomKey(match.id, category, slot.teamId as string, index)) : [],
  );
  const got = keys.filter((key) => isDone(key)).length;
  const complete = keys.length > 0 && got === keys.length;
  return (
    <article className="w-[15.5rem] shrink-0 rounded-2xl bg-[var(--surface)] ring-1 ring-[var(--line)]">
      <header className="flex items-baseline justify-between gap-2 border-b border-[var(--line)] px-2.5 py-1.5">
        <h3 className="text-sm font-extrabold">{matchTitle(match.label)}</h3>
        <span className={`text-[0.68rem] font-bold ${complete ? "text-[var(--mint)]" : "text-[var(--coral-ink)]"}`}>
          {got}/{keys.length || 0}
        </span>
      </header>
      {complete && openOnly ? (
        <p className="px-2.5 py-2 text-xs text-[var(--ink-soft)]">Room filled.</p>
      ) : (
        match.teams.map((slot) => {
          const team = slot.teamId ? teamsById.get(slot.teamId) : undefined;
          return (
            <div key={slot.slot} className="border-t border-[var(--line)] first:border-t-0">
              <div
                className="flex items-center gap-1.5 px-2 py-1"
                style={{ background: team ? `color-mix(in srgb, ${team.color} 20%, var(--surface))` : undefined }}
              >
                <span className="h-3.5 w-1 rounded-full" style={{ background: team?.color ?? "var(--line-strong)" }} />
                <span className="truncate text-[0.68rem] font-extrabold uppercase tracking-[0.08em]">
                  {team?.shortName ?? "TBD"}
                </span>
              </div>
              {team
                ? [0, 1, 2].map((index) => {
                    const key = roomKey(match.id, category, team.id, index);
                    const checked = isDone(key);
                    if (openOnly && checked) return null;
                    const runner = runnerAt(team, category, index);
                    const uma = runner?.umaName;
                    const style = styleShort(runner?.style);
                    const detail = [uma, style].filter(Boolean).join(" · ");
                    return (
                      <Tick
                        key={index}
                        checked={checked}
                        label={playerName(runner)}
                        detail={detail || undefined}
                        onToggle={() => onToggle(key)}
                      />
                    );
                  })
                : <p className="px-2 py-1 text-xs text-[var(--ink-soft)]">Waiting on the bracket.</p>}
            </div>
          );
        })
      )}
    </article>
  );
}
