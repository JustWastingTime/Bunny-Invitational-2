"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/constants";
import { spriteFileName, spriteLocalPath } from "@/lib/sprites";
import type { PlayerForm } from "@/lib/types";

type SortKey =
  | "trainer"
  | "umaName"
  | "team"
  | "style"
  | "rating"
  | "score"
  | "ppg"
  | "games"
  | "points"
  | "placePoints"
  | "oshi"
  | "penalty"
  | "wins";

const NUMBER_KEYS = new Set<SortKey>(["rating", "score", "ppg", "games", "points", "placePoints", "oshi", "penalty", "wins"]);

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "trainer", label: "Player", align: "left" },
  { key: "umaName", label: "Uma", align: "left" },
  { key: "team", label: "Team", align: "left" },
  { key: "style", label: "Style", align: "left" },
  { key: "rating", label: "Rating", align: "right" },
  { key: "score", label: "Score", align: "right" },
  { key: "ppg", label: "PPG", align: "right" },
  { key: "games", label: "GP", align: "right" },
  { key: "points", label: "Pts", align: "right" },
  { key: "placePoints", label: "Place", align: "right" },
  { key: "oshi", label: "Oshi", align: "right" },
  { key: "penalty", label: "Penalty", align: "right" },
  { key: "wins", label: "Wins", align: "right" },
];

function signedPoints(n: number) {
  if (n > 0) return `+${n}`;
  return String(n);
}

function ratingValue(rating: string) {
  const match = rating.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : -1;
}

function compare(a: PlayerForm, b: PlayerForm, key: SortKey) {
  if (key === "rating") return ratingValue(a.rating ?? "") - ratingValue(b.rating ?? "") || (a.rating ?? "").localeCompare(b.rating ?? "");
  if (key === "team") return a.shortName.localeCompare(b.shortName);
  if (key === "style") return (a.styleLabel || a.style || "").localeCompare(b.styleLabel || b.style || "");
  const left = a[key];
  const right = b[key];
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right));
}

export function PlayerTable({ rows }: { rows: PlayerForm[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("ppg");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [teamId, setTeamId] = useState("");
  const [race, setRace] = useState("");
  const [style, setStyle] = useState("");
  const [umaName, setUmaName] = useState("");

  const teams = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of rows) seen.set(row.teamId, row.shortName);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const styles = useMemo(() => {
    const seen = new Set<string>();
    for (const row of rows) {
      const label = row.styleLabel || row.style;
      if (label) seen.add(label);
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const umas = useMemo(() => {
    const seen = new Set<string>();
    for (const row of rows) {
      if (teamId && row.teamId !== teamId) continue;
      if (race && row.category !== race) continue;
      if (style && (row.styleLabel || row.style) !== style) continue;
      if (row.umaName) seen.add(row.umaName);
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [rows, teamId, race, style]);

  const shown = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (teamId && row.teamId !== teamId) return false;
      if (race && row.category !== race) return false;
      if (style && (row.styleLabel || row.style) !== style) return false;
      if (umaName && row.umaName !== umaName) return false;
      return true;
    });
    const direction = sortDir === "asc" ? 1 : -1;
    return filtered.sort(
      (a, b) =>
        compare(a, b, sortKey) * direction ||
        b.ppg - a.ppg ||
        a.trainer.localeCompare(b.trainer) ||
        a.umaName.localeCompare(b.umaName),
    );
  }, [rows, teamId, race, style, umaName, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(NUMBER_KEYS.has(key) ? "desc" : "asc");
  }

  if (!rows.length) {
    return <p className="text-sm text-[var(--ink-soft)]">No races scored yet.</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Filter
          label="Team"
          value={teamId}
          onChange={(value) => {
            setTeamId(value);
            setUmaName("");
          }}
        >
          <option value="">All teams</option>
          {teams.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Filter>
        <Filter
          label="Race"
          value={race}
          onChange={(value) => {
            setRace(value);
            setUmaName("");
          }}
        >
          <option value="">All races</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABEL[category]}
            </option>
          ))}
        </Filter>
        <Filter
          label="Style"
          value={style}
          onChange={(value) => {
            setStyle(value);
            setUmaName("");
          }}
        >
          <option value="">All styles</option>
          {styles.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </Filter>
        <Filter label="Uma" value={umaName} onChange={setUmaName}>
          <option value="">All umas</option>
          {umas.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Filter>
        <p className="pb-2 text-sm text-[var(--ink-soft)]">
          {shown.length} {shown.length === 1 ? "player" : "players"}
        </p>
      </div>

      {shown.length ? (
        <div className="min-w-0 overflow-x-auto rounded-2xl bg-[var(--surface)]">
          <table className="ink-table min-w-[72rem]">
            <thead>
              <tr>
                <th scope="col" className="w-8">
                  #
                </th>
                {COLUMNS.map((column) => {
                  const active = sortKey === column.key;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                      className={column.align === "right" ? "text-right" : undefined}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={`inline-flex items-center gap-1 uppercase tracking-[0.06em] ${
                          column.align === "right" ? "w-full justify-end" : ""
                        } ${active ? "text-[var(--ink)]" : "hover:text-[var(--ink)]"}`}
                      >
                        {column.label}
                        {active ? <span aria-hidden>{sortDir === "asc" ? "↑" : "↓"}</span> : null}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map((row, index) => (
                <tr key={`${row.teamId}-${row.category}-${row.slot}`}>
                  <td className="tabular-nums text-[var(--ink-soft)]">{index + 1}</td>
                  <td>
                    <Link href={`/teams/${row.teamId}`} className="flex items-center gap-2">
                      <UmaSprite spriteId={row.spriteId} />
                      <span className="min-w-0 truncate font-semibold">{row.trainer || "—"}</span>
                    </Link>
                  </td>
                  <td className="max-w-[14rem] truncate">{row.umaName}</td>
                  <td>
                    <Link href={`/teams/${row.teamId}`} className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0" style={{ background: row.color }} />
                      {row.shortName}
                    </Link>
                  </td>
                  <td>{row.styleLabel || row.style || "—"}</td>
                  <td className="text-right font-semibold tracking-wide">{row.rating || "—"}</td>
                  <td className="text-right tabular-nums">{row.score ? row.score.toLocaleString() : "—"}</td>
                  <td className="text-right font-semibold tabular-nums">{row.ppg.toFixed(1)}</td>
                  <td className="text-right tabular-nums">{row.games}</td>
                  <td className="text-right tabular-nums">{signedPoints(row.points)}</td>
                  <td className="text-right tabular-nums">{row.placePoints}</td>
                  <td className="text-right tabular-nums">{signedPoints(row.oshi)}</td>
                  <td className="text-right tabular-nums">{signedPoints(row.penalty)}</td>
                  <td className="text-right tabular-nums">{row.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--ink-soft)]">No players match these filters.</p>
      )}
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="grid min-w-[10rem] gap-1 text-xs font-extrabold uppercase tracking-[0.09em] text-[var(--ink-soft)]">
      {label}
      <select
        className="w-full truncate rounded-[3px] bg-[var(--surface-2)] px-3 py-2 text-sm font-normal normal-case tracking-normal text-[var(--ink)] ring-1 ring-[var(--line)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function UmaSprite({ spriteId }: { spriteId: string }) {
  const local = spriteLocalPath(spriteId);
  const remote = spriteFileName(spriteId);
  const src = local || remote;
  if (!src) return <span className="inline-block h-8 w-8" />;
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-8 w-8 object-contain"
        onError={(event) => {
          if (!remote || event.currentTarget.src === remote) return;
          event.currentTarget.src = remote;
        }}
      />
    </span>
  );
}
