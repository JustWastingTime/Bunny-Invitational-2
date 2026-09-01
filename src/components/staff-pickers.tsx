"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogSkill, CatalogUma } from "@/lib/tazuna-types";

const field =
  "w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--coral)]/40";

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
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-2xl bg-white p-1 shadow-lg ring-1 ring-[var(--line)]">
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
  onChange,
}: {
  skills: CatalogSkill[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return skills.slice(0, 10);
    return skills
      .filter((s) => `${s.name} ${s.aliases.join(" ")}`.toLowerCase().includes(q))
      .filter((s) => !value.includes(s.name))
      .slice(0, 12);
  }, [query, skills, value]);

  function add(name: string) {
    const skill = name.trim();
    if (!skill || value.includes(skill)) return;
    onChange([...value, skill]);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={box} className="relative">
      <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">Skills</label>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {value.map((skill) => (
          <button
            key={skill}
            type="button"
            className="rounded-full bg-white px-2.5 py-1 text-xs ring-1 ring-[var(--line)]"
            onClick={() => onChange(value.filter((s) => s !== skill))}
            title="Remove"
          >
            {skill} ×
          </button>
        ))}
      </div>
      <input
        className={field}
        value={query}
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
      {open && query.trim() ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-2xl bg-white p-1 shadow-lg ring-1 ring-[var(--line)]">
          {matches.map((skill) => (
            <li key={skill.name}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left text-sm hover:bg-[var(--paper)]"
                onClick={() => add(skill.name)}
              >
                <span>{skill.name}</span>
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
