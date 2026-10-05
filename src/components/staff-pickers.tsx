"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { plainSkillName } from "@/lib/skill-name";
import type { CatalogSkill, CatalogUma } from "@/lib/tazuna-types";

const field =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)]/40";

export function UmaPicker({
  umas,
  value,
  spriteId,
  onSelect,
}: {
  umas: CatalogUma[];
  value: string;
  spriteId: string;
  onSelect: (uma: CatalogUma) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const selected = umas.find((u) => u.spriteId === spriteId && u.name === value) ?? umas.find((u) => u.spriteId === spriteId);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? umas.slice(0, 12)
      : umas.filter((u) => {
          const hay = `${u.name} ${u.characterName} ${u.type} ${u.costume} ${u.spriteId} ${u.aliases.join(" ")}`.toLowerCase();
          return hay.includes(q);
        });
    return list.slice(0, 16);
  }, [query, umas]);

  const thumb = selected?.thumbnail;

  return (
    <div ref={box} className="relative">
      <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Uma</label>
      <div className="flex gap-2">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--paper)] ring-1 ring-[var(--line)]">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="h-14 w-14 object-contain"
              onError={(e) => {
                const fallback = selected?.fallbackThumb;
                if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
              }}
            />
          ) : (
            <span className="text-[0.65rem] text-[var(--ink-soft)]">?</span>
          )}
        </div>
        <input
          className={field}
          value={query}
          placeholder="Search name, costume, or alias"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
      </div>
      {open ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-2xl bg-[var(--surface-strong)] p-1 shadow-lg ring-1 ring-[var(--line)]">
          {matches.length ? (
            matches.map((uma) => (
              <li key={uma.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-[var(--paper)]"
                  onClick={() => {
                    onSelect(uma);
                    setQuery(uma.name);
                    setOpen(false);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uma.thumbnail}
                    alt=""
                    className="h-9 w-9 object-contain"
                    onError={(e) => {
                      if (uma.fallbackThumb && e.currentTarget.src !== uma.fallbackThumb) e.currentTarget.src = uma.fallbackThumb;
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{uma.name}</span>
                    <span className="block truncate text-xs text-[var(--ink-soft)]">{uma.costume}</span>
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-[var(--ink-soft)]">No match in the Tazuna snapshot.</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

export function SkillInput({
  skills,
  value,
  locked = false,
  onChange,
}: {
  skills: CatalogSkill[];
  value: string[];
  locked?: boolean;
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const handles = useRef<Array<HTMLButtonElement | null>>([]);
  const pendingFocus = useRef<number | null>(null);
  const canFold = value.length > 4;
  const shown = !canFold || expanded;

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const selected = useMemo(() => new Set(value.map(plainSkillName)), [value]);

  const matches = useMemo(() => {
    const q = plainSkillName(query).toLowerCase();
    if (!q) return skills.slice(0, 10);
    return skills
      .filter((s) => plainSkillName(`${s.name} ${s.aliases.join(" ")}`).toLowerCase().includes(q))
      .filter((s) => !selected.has(plainSkillName(s.name)))
      .slice(0, 12);
  }, [query, selected, skills]);

  useEffect(() => {
    if (pendingFocus.current == null) return;
    handles.current[pendingFocus.current]?.focus();
    pendingFocus.current = null;
  }, [value]);

  function add(name: string) {
    const skill = plainSkillName(name);
    if (!skill || selected.has(skill)) return;
    onChange([...value, skill]);
    setQuery("");
    setOpen(false);
    setExpanded(true);
  }

  function move(from: number, to: number, focus = false) {
    if (to < 0 || to >= value.length || from === to) return;
    const next = value.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    if (focus) pendingFocus.current = to;
    onChange(next);
  }

  return (
    <div ref={box} className="relative">
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">
          Skills{value.length ? ` · ${value.length}` : ""}
        </label>
        {canFold ? (
          <button
            type="button"
            className="text-xs font-bold text-[var(--ink-soft)] hover:text-[var(--ink)]"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        ) : null}
      </div>
      {value.length && !shown ? (
        <button
          type="button"
          className="mb-2 line-clamp-2 w-full text-left text-xs leading-snug text-[var(--ink)]"
          onClick={() => setExpanded(true)}
        >
          {value.map((skill) => plainSkillName(skill)).join(" · ")}
        </button>
      ) : null}
      {value.length && shown ? (
        <ul className="mb-2 flex flex-wrap gap-1">
          {value.map((skill, index) => (
            <li
              key={skill}
              className={`inline-flex max-w-full items-center gap-0.5 rounded-full bg-[var(--surface-strong)] py-0.5 pr-1 pl-1 text-[0.72rem] leading-none ring-1 ${
                overIndex === index && dragIndex !== index ? "ring-[var(--coral)]" : "ring-[var(--line)]"
              } ${dragIndex === index ? "opacity-50" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                if (dragIndex !== index) setOverIndex(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex != null) move(dragIndex, index);
                setDragIndex(null);
                setOverIndex(null);
              }}
            >
              <button
                type="button"
                ref={(node) => {
                  handles.current[index] = node;
                }}
                draggable={!locked}
                disabled={locked}
                aria-label={`Reorder ${plainSkillName(skill)}`}
                title="Drag to reorder. Arrow keys move it."
                className="grid h-4 w-4 shrink-0 cursor-grab place-items-center rounded-full text-[var(--ink-soft)] active:cursor-grabbing disabled:cursor-default"
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(index));
                  setDragIndex(index);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    event.preventDefault();
                    move(index, index - 1, true);
                  }
                  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    event.preventDefault();
                    move(index, index + 1, true);
                  }
                }}
              >
                <span aria-hidden className="text-[0.7rem] leading-none">
                  ⋮
                </span>
              </button>
              <span className="truncate font-medium">{plainSkillName(skill)}</span>
              <button
                type="button"
                disabled={locked}
                className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-[var(--ink-soft)] hover:text-[var(--ink)] disabled:opacity-40"
                aria-label={`Remove ${plainSkillName(skill)}`}
                onClick={() => onChange(value.filter((item) => item !== skill))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {shown ? (
        <input
          className={field}
          value={query}
          disabled={locked}
          placeholder="Type a skill, then pick or press Enter"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(matches[0]?.name ?? query);
            }
          }}
        />
      ) : null}
      {open && query.trim() ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-2xl bg-[var(--surface-strong)] p-1 shadow-lg ring-1 ring-[var(--line)]">
          {matches.map((skill) => (
            <li key={skill.name}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left text-sm hover:bg-[var(--paper)]"
                onClick={() => add(skill.name)}
              >
                <span>{plainSkillName(skill.name)}</span>
                {skill.rarity ? <span className="text-xs text-[var(--ink-soft)]">{skill.rarity}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export { field as staffFieldClass };
