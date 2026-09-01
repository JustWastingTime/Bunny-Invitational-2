"use client";

import { useEffect, useState } from "react";
import { GROUPS, TEAMS_PER_GROUP } from "@/lib/constants";

type TeamRow = {
  id: string;
  name: string;
  shortName: string | null;
  color: string;
  group: string | null;
  groupSlot: number | null;
};

function sortColumn(rows: TeamRow[]) {
  return [...rows].sort((a, b) => (a.groupSlot ?? 99) - (b.groupSlot ?? 99) || a.name.localeCompare(b.name));
}

export default function GroupsEditor() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [status, setStatus] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);

  async function reload() {
    const res = await fetch("/api/staff/groups");
    const json = await res.json();
    setTeams(json.teams ?? []);
  }

  useEffect(() => {
    reload();
  }, []);

  function moveTeam(id: string, group: string | null, beforeId?: string) {
    const moving = teams.find((t) => t.id === id);
    if (!moving) return;
    if (group && moving.group !== group && teams.filter((t) => t.group === group).length >= TEAMS_PER_GROUP) {
      setStatus(`Group ${group} already has ${TEAMS_PER_GROUP} teams.`);
      return;
    }
    setStatus("");
    setTeams((rows) => {
      const current = rows.find((t) => t.id === id);
      if (!current) return rows;
      const rest = rows.filter((t) => t.id !== id);
      const column = sortColumn(rest.filter((t) => t.group === group));
      let insertAt = column.length;
      if (beforeId) {
        const idx = column.findIndex((t) => t.id === beforeId);
        if (idx >= 0) insertAt = idx;
      }
      const nextColumn = [...column.slice(0, insertAt), { ...current, group }, ...column.slice(insertAt)].map(
        (t, i) => ({ ...t, groupSlot: group ? i : null }),
      );
      const nextIds = new Set(nextColumn.map((t) => t.id));
      return [...rest.filter((t) => !nextIds.has(t.id)), ...nextColumn];
    });
  }

  async function save() {
    setStatus("Saving…");
    const res = await fetch("/api/staff/groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignments: teams.map((t) => ({ id: t.id, group: t.group, groupSlot: t.groupSlot })),
      }),
    });
    setStatus(res.ok ? "Groups saved and matchups regenerated." : "Save failed");
    if (res.ok) reload();
  }

  const unassigned = sortColumn(teams.filter((t) => !t.group));

  return (
    <div className="grid gap-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Groups</h1>
      <p className="text-sm text-[var(--ink-soft)]">
        Drag teams into A, B, or C. Seven per group. Order in a column is the group slot used for Steiner matchups.
        Play-in teams stay off this board.
      </p>

      <section>
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Unassigned</h2>
        <DropColumn
          group={null}
          teams={unassigned}
          dragging={dragging}
          onDragStart={setDragging}
          onDragEnd={() => setDragging(null)}
          onDrop={moveTeam}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {GROUPS.map((group) => (
          <section key={group} className="rounded-3xl bg-white p-3 ring-1 ring-[var(--line)]">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-2xl">Group {group}</h2>
              <span className="text-sm text-[var(--ink-soft)]">
                {teams.filter((t) => t.group === group).length}/{TEAMS_PER_GROUP}
              </span>
            </div>
            <DropColumn
              group={group}
              teams={sortColumn(teams.filter((t) => t.group === group))}
              dragging={dragging}
              onDragStart={setDragging}
              onDragEnd={() => setDragging(null)}
              onDrop={moveTeam}
            />
          </section>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void save()} className="rounded-full bg-[var(--coral)] px-4 py-2 text-white">
          Save & regenerate matches
        </button>
        <span className="self-center text-sm text-[var(--ink-soft)]">{status}</span>
      </div>
    </div>
  );
}

function DropColumn({
  group,
  teams,
  dragging,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  group: string | null;
  teams: TeamRow[];
  dragging: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (id: string, group: string | null, beforeId?: string) => void;
}) {
  return (
    <ul
      className="grid min-h-24 gap-2 rounded-2xl bg-[var(--paper)]/60 p-2"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/team-id") || e.dataTransfer.getData("text/plain");
        if (id) onDrop(id, group);
      }}
    >
      {teams.map((team) => (
        <li
          key={team.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", team.id);
            e.dataTransfer.setData("text/team-id", team.id);
            e.dataTransfer.effectAllowed = "move";
            onDragStart(team.id);
          }}
          onDragEnd={onDragEnd}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = e.dataTransfer.getData("text/team-id") || e.dataTransfer.getData("text/plain");
            if (id && id !== team.id) onDrop(id, group, team.id);
          }}
          className={`flex cursor-grab items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-[var(--line)] active:cursor-grabbing ${
            dragging === team.id ? "opacity-50" : ""
          }`}
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: team.color }} />
          <span className="font-[family-name:var(--font-display)]">{team.shortName || team.name}</span>
        </li>
      ))}
      {!teams.length ? <li className="px-2 py-6 text-center text-sm text-[var(--ink-soft)]">Drop teams here</li> : null}
    </ul>
  );
}
