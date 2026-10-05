import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { spriteFileName } from "@/lib/sprites";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  GROUPS,
  PLAY_IN_STAGE,
  TEAM_KIND_PLAYIN,
  scheduledDay,
  type Category,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

const KEY_RE = /^(code|room):[A-Za-z0-9_.:|-]{1,180}$/;

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

type BoardSection = { title: string; matches: BoardMatch[] };

function runnersOf(
  entries: {
    category: string;
    slot: number;
    trainer: string;
    umaName: string;
    spriteId: string;
    score: string | null;
    style: string | null;
    styleWarn: boolean;
  }[],
): Runner[] {
  return CATEGORIES.flatMap((category) =>
    [0, 1, 2].map((slot) => {
      const row = entries.find((entry) => entry.category === category && entry.slot === slot);
      return {
        category,
        slot,
        trainer: row?.trainer?.trim() ?? "",
        umaName: row?.umaName?.trim() && row.umaName !== "TBD" ? row.umaName : "",
        spriteId: row?.spriteId ?? "",
        spritePath: spriteFileName(row?.spriteId),
        score: row?.score?.trim() || null,
        style: row?.style ?? null,
        styleWarn: Boolean(row?.styleWarn),
      };
    }),
  );
}

export async function GET() {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const [teams, matches, marks] = await Promise.all([
    prisma.team.findMany({ include: { umaEntries: true } }),
    prisma.match.findMany({
      include: { teams: { orderBy: { slot: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.deskMark.findMany({ where: { done: true }, select: { key: true } }),
  ]);

  const teamRows = teams.map((team) => ({
    id: team.id,
    name: team.name,
    shortName: team.shortName?.trim() || team.name,
    color: team.color,
    kind: team.kind,
    group: team.group,
    groupSlot: team.groupSlot ?? 99,
    runners: runnersOf(team.umaEntries),
  }));

  const matchRows = matches.map((match) => ({
    id: match.id,
    stage: match.stage,
    group: match.group,
    label: match.label,
    day: scheduledDay(match),
    sortOrder: match.sortOrder,
    teams: [0, 1, 2].map((slot) => ({
      slot,
      teamId: match.teams.find((row) => row.slot === slot)?.teamId ?? null,
    })),
  }));

  const playInTeams = teamRows
    .filter((team) => team.kind === TEAM_KIND_PLAYIN)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const playInMatches = matchRows.filter((match) => match.stage === PLAY_IN_STAGE);

  const knockoutMatches = matchRows.filter((match) => match.stage === "qf" || match.stage === "semi" || match.stage === "gf");
  const knockoutIds = new Set(knockoutMatches.flatMap((match) => match.teams.map((team) => team.teamId).filter(Boolean)));

  function asTeams(rows: typeof teamRows): BoardTeam[] {
    return rows.map(({ id, name, shortName, color, runners }) => ({ id, name, shortName, color, runners }));
  }

  function asMatches(rows: typeof matchRows): BoardMatch[] {
    return rows.map(({ id, label, day, sortOrder, teams: slots }) => ({ id, label, day, sortOrder, teams: slots }));
  }

  const groupTeams = teamRows
    .filter((team) => team.kind !== TEAM_KIND_PLAYIN && (team.group === "A" || team.group === "B" || team.group === "C"))
    .sort((a, b) => (a.group ?? "").localeCompare(b.group ?? "") || a.groupSlot - b.groupSlot || a.shortName.localeCompare(b.shortName));

  function groupSections(day: number): BoardSection[] {
    return GROUPS.map((group) => ({
      title: `Group ${group}`,
      matches: asMatches(
        matchRows.filter((match) => match.stage === "group" && match.group === group && match.day === day),
      ),
    }));
  }

  const boards = [
    {
      id: "playin",
      label: "Play-in",
      teams: asTeams(playInTeams),
      sections: [{ title: "", matches: asMatches(playInMatches) }],
    },
    {
      id: "day1",
      label: "Group Day 1",
      teams: asTeams(groupTeams),
      sections: groupSections(1),
    },
    {
      id: "day2",
      label: "Group Day 2",
      teams: asTeams(groupTeams),
      sections: groupSections(2),
    },
    {
      id: "day3",
      label: "Day 3",
      teams: asTeams(teamRows.filter((team) => knockoutIds.has(team.id)).sort((a, b) => a.shortName.localeCompare(b.shortName))),
      sections: [
        { title: "Last Chance", matches: asMatches(knockoutMatches.filter((match) => match.stage === "qf")) },
        { title: "Semis", matches: asMatches(knockoutMatches.filter((match) => match.stage === "semi")) },
        { title: "Finals", matches: asMatches(knockoutMatches.filter((match) => match.stage === "gf")) },
      ],
    },
  ];

  return NextResponse.json({
    categories: CATEGORIES.map((id) => ({ id, label: CATEGORY_LABEL[id] })),
    boards,
    done: marks.map((mark) => mark.key),
  });
}

export async function PATCH(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });
  const body = (await request.json()) as { key?: string; done?: boolean };
  const key = body.key ?? "";
  if (!KEY_RE.test(key) || typeof body.done !== "boolean") {
    return NextResponse.json({ error: "bad key" }, { status: 400 });
  }
  if (body.done) {
    await prisma.deskMark.upsert({ where: { key }, create: { key, done: true }, update: { done: true } });
  } else {
    await prisma.deskMark.deleteMany({ where: { key } });
  }
  return NextResponse.json({ ok: true });
}
