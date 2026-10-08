"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStaffToast } from "@/components/staff-toast";
import { spriteLocalPath } from "@/lib/sprites";
import type { Category } from "@/lib/constants";

type Runner = {
  category: Category;
  slot: number;
  trainer: string;
  umaName: string;
  spriteId: string;
  spritePath: string | null;
  score: string | null;
  style: string | null;
  styleWarn: boolean;
  note: string;
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

type Board = {
  id: string;
  label: string;
  teams: BoardTeam[];
  sections: { title: string; matches: BoardMatch[] }[];
};

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

function scoreNumber(score: string | null | undefined) {
  const raw = String(score ?? "").replace(/,/g, "").trim();
  if (!raw) return -1;
  const n = Number(raw);
  return Number.isFinite(n) ? n : -1;
}

function formatScore(score: string | null | undefined) {
  const n = scoreNumber(score);
  if (n < 0) return "";
  return n.toLocaleString("en-US");
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

  const shownBoards =
    payload?.boards.filter((item) => (mode === "codes" ? item.id === "playin" || item.id === "main" : item.id !== "main")) ??
    [];
  const board = shownBoards.find((item) => item.id === boardId) ?? shownBoards[0];
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

  function patchRunner(teamId: string, category: string, slot: number, patch: { styleWarn?: boolean; note?: string }) {
    setPayload((current) => {
      if (!current) return current;
      return {
        ...current,
        boards: current.boards.map((item) => ({
          ...item,
          teams: item.teams.map((team) =>
            team.id !== teamId
              ? team
              : {
                  ...team,
                  runners: team.runners.map((runner) =>
                    runner.category === category && runner.slot === slot ? { ...runner, ...patch } : runner,
                  ),
                },
          ),
        })),
      };
    });
    void fetch("/api/staff/lobby", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ teamId, category, slot, ...patch }),
    }).then((response) => {
      if (!response.ok) toast.error("Could not save that");
    });
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
          <Seg
            on={mode === "codes"}
            onClick={() => {
              setMode("codes");
              setBoardId((id) => (id === "playin" ? id : "main"));
            }}
          >
            Codes
          </Seg>
          <Seg
            on={mode === "rooms"}
            onClick={() => {
              setMode("rooms");
              setBoardId((id) => (id === "main" ? "day1" : id));
            }}
          >
            Rooms
          </Seg>
          <Seg on={openOnly} onClick={() => setOpenOnly((value) => !value)}>
            {openOnly ? "Showing open" : "Show open"}
          </Seg>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {shownBoards.map((item) => (
          <Seg key={item.id} on={item.id === board.id} onClick={() => setBoardId(item.id)}>
            {item.label}
          </Seg>
        ))}
      </div>

      {mode === "codes" ? (
        board.teams.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">No clubs on this board yet.</p>
        ) : (
          <CodeSheet
            board={board}
            categories={categories}
            openOnly={openOnly}
            isDone={isDone}
            onToggle={toggle}
            onPatch={patchRunner}
          />
        )
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

function CodeRunner({
  checked,
  runner,
  onToggle,
  onWarn,
  onNote,
}: {
  checked: boolean;
  runner: Runner | undefined;
  onToggle: () => void;
  onWarn: () => void;
  onNote: (note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(runner?.note ?? "");
  useEffect(() => {
    if (!editing) setDraft(runner?.note ?? "");
  }, [editing, runner?.note]);
  const warn = Boolean(runner?.styleWarn);
  const style = styleShort(runner?.style);
  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next !== (runner?.note ?? "")) onNote(next);
  }
  return (
    <div className={`group relative px-0.5 py-0.5 ${checked ? "text-[var(--ink-soft)]" : "text-[var(--ink)]"}`}>
      <div className="flex items-center gap-1">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 shrink-0 accent-[var(--accent-solid)]"
          checked={checked}
          aria-label={playerName(runner)}
          onChange={onToggle}
        />
        <span className={`min-w-0 flex-1 truncate text-[0.8rem] font-semibold leading-tight ${checked ? "line-through decoration-[var(--line-strong)]" : ""} ${warn ? "font-extrabold text-[#d1262d]" : ""}`}>
          {playerName(runner)}
        </span>
        {warn && style ? (
          <span className="shrink-0 text-[0.62rem] font-extrabold uppercase leading-none tracking-wide text-[#d1262d]">{style}</span>
        ) : null}
      </div>
      <div className="pointer-events-none absolute top-0.5 right-0 hidden items-center gap-0.5 rounded bg-[var(--surface)]/95 pl-1 group-focus-within:pointer-events-auto group-focus-within:flex group-hover:pointer-events-auto group-hover:flex">
        <button
          type="button"
          aria-pressed={warn}
          aria-label={warn ? "Clear style warning" : "Style warning"}
          title={warn ? `Style warning: ${style || "set"}` : "Flag a wrong style"}
          onClick={onWarn}
          className={`grid h-4 w-4 place-items-center rounded text-[0.65rem] font-extrabold leading-none ${
            warn ? "bg-[#d1262d] text-white" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
          }`}
        >
          !
        </button>
        {runner?.note || editing ? null : (
          <button
            type="button"
            aria-label={`Note for ${playerName(runner)}`}
            title="Add a note"
            onClick={() => setEditing(true)}
            className="grid h-4 w-4 place-items-center rounded text-[0.75rem] leading-none text-[var(--ink-soft)] hover:text-[var(--ink)]"
          >
            +
          </button>
        )}
      </div>
      {editing ? (
        <input
          autoFocus
          value={draft}
          maxLength={160}
          aria-label={`Note for ${playerName(runner)}`}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
            if (event.key === "Escape") {
              setDraft(runner?.note ?? "");
              setEditing(false);
            }
          }}
          className="mt-0.5 w-full rounded bg-[var(--paper)] px-1 py-0.5 text-[0.68rem] ring-1 ring-[var(--line)]"
        />
      ) : runner?.note ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          title={runner.note}
          className="mt-0.5 line-clamp-2 w-full rounded bg-[var(--gold)] px-1 text-left text-[0.68rem] font-semibold leading-tight text-[#3a2a08]"
        >
          {runner.note}
        </button>
      ) : null}
    </div>
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
  onPatch,
}: {
  board: Board;
  categories: { id: Category; label: string }[];
  openOnly: boolean;
  isDone: (key: string) => boolean;
  onToggle: (key: string) => void;
  onPatch: (teamId: string, category: string, slot: number, patch: { styleWarn?: boolean; note?: string }) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-[var(--surface)] ring-1 ring-[var(--line)]">
      <div
        className="grid"
        style={{ gridTemplateColumns: "5.5rem repeat(5, minmax(0, 1fr))" }}
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
          <TeamCodeRow
            key={team.id}
            team={team}
            categories={categories}
            openOnly={openOnly}
            isDone={isDone}
            onToggle={onToggle}
            onPatch={onPatch}
          />
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
  onPatch,
}: {
  team: BoardTeam;
  categories: { id: Category; label: string }[];
  openOnly: boolean;
  isDone: (key: string) => boolean;
  onToggle: (key: string) => void;
  onPatch: (teamId: string, category: string, slot: number, patch: { styleWarn?: boolean; note?: string }) => void;
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
              <CodeRunner
                key={slot}
                checked={checked}
                runner={runner}
                onToggle={() => onToggle(key)}
                onWarn={() => onPatch(team.id, cat.id, slot, { styleWarn: !runner?.styleWarn })}
                onNote={(note) => onPatch(team.id, cat.id, slot, { note })}
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
  const matches = board.sections.flatMap((section) => section.matches);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const slots = matches.flatMap((match) =>
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
      {matches.length === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">No matches on this board yet.</p>
      ) : (
        board.sections.map((section) =>
          section.matches.length === 0 ? null : (
            <section key={section.title || "matches"} className="grid gap-2">
              {section.title ? <h2 className="text-sm font-extrabold uppercase tracking-[0.08em]">{section.title}</h2> : null}
              <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {section.matches.map((match) => (
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
          ),
        )
      )}
    </div>
  );
}

function RoomRunner({
  checked,
  runner,
  onToggle,
}: {
  checked: boolean;
  runner: Runner | undefined;
  onToggle: () => void;
}) {
  const local = spriteLocalPath(runner?.spriteId);
  const src = local || runner?.spritePath;
  const style = styleShort(runner?.style);
  const score = formatScore(runner?.score);
  return (
    <div className={`px-1.5 py-1 ${checked ? "text-[var(--ink-soft)]" : "text-[var(--ink)]"}`}>
      <label className="grid cursor-pointer grid-cols-[auto_2rem_minmax(0,1fr)_auto] items-center gap-1.5">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-[var(--accent-solid)]"
          checked={checked}
          onChange={onToggle}
        />
        <span className="grid h-8 w-8 place-items-center overflow-hidden rounded bg-[var(--paper-2)]">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              className="h-8 w-8 object-contain"
              onError={(event) => {
                const remote = runner?.spritePath;
                if (!remote || event.currentTarget.src === remote) return;
                event.currentTarget.src = remote;
              }}
            />
          ) : (
            <span className="text-[0.6rem] text-[var(--ink-soft)]">?</span>
          )}
        </span>
        <span className="min-w-0 leading-tight">
          <span className={`block truncate text-[0.8rem] font-semibold ${checked ? "line-through decoration-[var(--line-strong)]" : ""}`}>
            {playerName(runner)}
          </span>
          <span className={`block truncate text-[0.68rem] ${runner?.styleWarn ? "font-extrabold text-[#d1262d]" : "text-[var(--ink-soft)]"}`}>
            {style || "—"}
          </span>
        </span>
        <span className="font-mono text-[0.68rem] font-bold tabular-nums">{score}</span>
      </label>
      {runner?.note ? (
        <p
          title={runner.note}
          className="mt-0.5 ml-[3.625rem] line-clamp-2 rounded bg-[var(--gold)] px-1 text-[0.68rem] font-semibold leading-tight text-[#3a2a08]"
        >
          {runner.note}
        </p>
      ) : null}
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
    <article className="min-w-0 rounded-2xl bg-[var(--surface)] ring-1 ring-[var(--line)]">
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
                ? [0, 1, 2]
                    .map((index) => ({ index, runner: runnerAt(team, category, index) }))
                    .sort((a, b) => scoreNumber(b.runner?.score) - scoreNumber(a.runner?.score))
                    .map(({ index, runner }) => {
                      const key = roomKey(match.id, category, team.id, index);
                      const checked = isDone(key);
                      if (openOnly && checked) return null;
                      return (
                        <RoomRunner
                          key={index}
                          checked={checked}
                          runner={runner}
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
