import Image from "next/image";
import { plainSkillName } from "@/lib/skill-name";
import type { PublicUma, UmaFinishRecord } from "@/lib/types";
import { emptyFinish } from "@/lib/uma-finish";

const STAT_LABEL: Record<keyof PublicUma["stats"], string> = {
  speed: "SPD",
  stamina: "STA",
  power: "POW",
  guts: "GUT",
  wisdom: "WIT",
};

const PLACE_LABEL = ["1st", "2nd", "3rd", "4th", "5th"] as const;

export function UmaRosterCard({
  uma,
  finish,
  skillRarity = {},
}: {
  uma: PublicUma;
  finish?: UmaFinishRecord;
  skillRarity?: Record<string, string>;
}) {
  const filled = Boolean(uma.umaName && uma.umaName !== "TBD");
  const record = finish ?? emptyFinish();

  return (
    <article className={`rounded-2xl bg-[var(--surface)] p-3 ${filled ? "" : "opacity-70"}`}>
      <div className="flex gap-3">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--paper-2)]">
          {uma.spritePath ? (
            <Image src={uma.spritePath} alt={uma.umaName} width={96} height={96} className="h-24 w-24 object-contain" />
          ) : (
            <span className="text-xs text-[var(--ink-soft)]">no art</span>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="font-[family-name:var(--font-display)] text-xl leading-tight">{uma.umaName}</h4>
          <p className="text-sm text-[var(--ink-soft)]">
            {uma.trainer || "Trainer TBD"} · {uma.rating ?? "—"}
            {uma.score ? ` · ${uma.score}` : ""} · {uma.styleLabel ?? "—"}
          </p>
          <p className="mt-1 text-xs">
            {uma.spriteId && uma.isUnique ? <span className="mr-2 font-semibold text-[var(--mint)]">Unique</span> : null}
            {uma.popularityRank && uma.popularityRank <= 3 && uma.pickCount > 1 ? (
              <span className="mr-2 font-semibold">Popular #{uma.popularityRank}</span>
            ) : null}
            Apt {uma.aptitudes.terrain ?? "—"}/{uma.aptitudes.distance ?? "—"}/{uma.aptitudes.style ?? "—"}
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-5 gap-px bg-[var(--line)] text-center text-xs">
        {(Object.keys(STAT_LABEL) as (keyof PublicUma["stats"])[]).map((key) => (
          <div key={key} className="bg-[var(--paper)] py-1">
            <dt className="uppercase text-[var(--ink-soft)]">{STAT_LABEL[key]}</dt>
            <dd className="font-semibold tabular-nums">{uma.stats[key]}</dd>
          </div>
        ))}
      </dl>

      {uma.skills.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {uma.skills.map((skill, index) => {
            const label = plainSkillName(skill);
            return (
              <li key={`${label}-${index}`} className={skillChipClass(index, skillRarity[label] ?? skillRarity[skill])}>
                {label}
              </li>
            );
          })}
        </ul>
      ) : null}

      <table className="mt-3 w-full border-collapse text-center text-xs">
        <caption className="sr-only">Finishes and points for {uma.umaName}</caption>
        <thead>
          <tr>
            {PLACE_LABEL.map((label) => (
              <th key={label} scope="col" className="px-1 py-1 font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">
                {label}
              </th>
            ))}
            <th scope="col" className="px-1 py-1 font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-[var(--paper)]">
            {record.places.map((count, index) => (
              <td key={PLACE_LABEL[index]} className="px-1 py-1 font-semibold tabular-nums">
                {count}
              </td>
            ))}
            <td className="px-1 py-1 font-semibold tabular-nums">{record.points}</td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}

function skillChipClass(index: number, rarity: string | undefined) {
  if (index === 0) return "skill-chip skill-chip-unique";
  if (rarity === "unique") return "skill-chip skill-chip-unique skill-chip-inherited";
  if (rarity === "rare") return "skill-chip skill-chip-rare";
  return "skill-chip";
}
