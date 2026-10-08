export const TOURNAMENT_NAME = "Bunny Invitational 2";
/** Discord account that can open staff settings and grant desk access. */
export const OWNER_DISCORD_ID = "217274197553053696";
/** Public site: navbar links for teams/stats, real umas on the scoreboard, and live match cues. */
export const PUBLIC_TOURNAMENT_LIVE = false;
/** Main-field rosters on /teams and /stats. Those pages stay out of the navbar until the flag above is on. */
export const PUBLIC_FIELD_LIVE = true;

export const CATEGORIES = ["sprint", "mile", "medium", "long", "dirt"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  sprint: "Sprint",
  mile: "Mile",
  medium: "Medium",
  long: "Long",
  dirt: "Dirt",
};

/** Public group tables, group-stage schedule, and knockout. Independent of uma/stats reveal. */
export const PUBLIC_GROUPS_LIVE = false;

export type TrackPiece = "straight" | "corner";

export type RaceMap = {
  category: Category;
  venue: string;
  distanceM: number;
  course: string | null;
  direction: "clockwise" | "counterclockwise";
  surface: "turf" | "dirt";
  season: "Spring" | "Summer" | "Fall" | "Winter";
  weather: "Sunny" | "Cloudy" | "Rainy" | "Snowy";
  going: "Firm" | "Good" | "Soft" | "Heavy";
  layout: { kind: TrackPiece; label: string }[];
};

export const RACE_MAPS: RaceMap[] = [
  { category: "sprint", venue: "Hanshin", distanceM: 1200, course: "Inner", direction: "clockwise", surface: "turf", season: "Fall", weather: "Sunny", going: "Firm",
    layout: [
      { kind: "straight", label: "Straight" },
      { kind: "corner", label: "Corner 3" },
      { kind: "corner", label: "Corner 4" },
      { kind: "straight", label: "Straight" },
    ],
  },
  { category: "mile", venue: "Kyoto", distanceM: 1600, course: "Outer", direction: "clockwise", surface: "turf", season: "Fall", weather: "Sunny", going: "Firm",
    layout: [
      { kind: "straight", label: "Straight" },
      { kind: "corner", label: "Corner 3" },
      { kind: "corner", label: "Corner 4" },
      { kind: "straight", label: "Straight" },
    ],
  },
  { category: "medium", venue: "Chukyo", distanceM: 2200, course: null, direction: "counterclockwise", surface: "turf", season: "Summer", weather: "Cloudy", going: "Good",
    layout: [
      { kind: "straight", label: "Straight" },
      { kind: "corner", label: "Corner 1" },
      { kind: "corner", label: "Corner 2" },
      { kind: "straight", label: "Straight" },
      { kind: "corner", label: "Corner 3" },
      { kind: "corner", label: "Corner 4" },
      { kind: "straight", label: "Straight" },
    ],
  },
  { category: "long", venue: "Nakayama", distanceM: 2500, course: "Inner", direction: "clockwise", surface: "turf", season: "Winter", weather: "Snowy", going: "Good",
    layout: [
      { kind: "corner", label: "Corner 3" },
      { kind: "corner", label: "Corner 4" },
      { kind: "straight", label: "Straight" },
      { kind: "corner", label: "Corner 1" },
      { kind: "corner", label: "Corner 2" },
      { kind: "straight", label: "Straight" },
      { kind: "corner", label: "Corner 3" },
      { kind: "corner", label: "Corner 4" },
      { kind: "straight", label: "Straight" },
    ],
  },
  { category: "dirt", venue: "Sapporo", distanceM: 1700, course: null, direction: "clockwise", surface: "dirt", season: "Fall", weather: "Cloudy", going: "Firm",
    layout: [
      { kind: "straight", label: "Straight" },
      { kind: "corner", label: "Corner 1" },
      { kind: "corner", label: "Corner 2" },
      { kind: "straight", label: "Straight" },
      { kind: "corner", label: "Corner 3" },
      { kind: "corner", label: "Corner 4" },
      { kind: "straight", label: "Straight" },
    ],
  },
];

export const PLACE_POINTS: Record<number, number> = {
  1: 8,
  2: 5,
  3: 3,
  4: 2,
  5: 1,
};

export const UNIQUE_BONUS = 2;
export const PAIR_BONUS = 1;
export const POPULAR_PENALTY_FIRST = -2;
export const POPULAR_PENALTY_SECOND_THIRD = -1;

export const GROUPS = ["A", "B", "C"] as const;
export type GroupId = (typeof GROUPS)[number];
export const TEAMS_PER_GROUP = 7;
export const PLAY_IN_TEAM_COUNT = 7;
export const TEAM_KIND_MAIN = "main";
export const TEAM_KIND_PLAYIN = "playin";
export const PLAY_IN_STAGE = "playin";
export const PLAY_IN_GROUP = "P";
/** All seven play-in matches run on this one session (Match.day). */
export const PLAY_IN_DAY = 0;
export const PLAY_IN_EVENT_LABEL = "Sat 3 Oct 2026, 3:00 PM UTC";

/** Main stage. Discord session starts: 1791565200, 1791644400, 1791730800. */
export const MAIN_STAGE_DAYS = [
  { day: 1, label: "Fri 9 Oct 2026, 5:00 PM UTC" },
  { day: 2, label: "Sat 10 Oct 2026, 3:00 PM UTC" },
  { day: 3, label: "Sun 11 Oct 2026, 3:00 PM UTC" },
] as const;
export const KNOCKOUT_DAY = 3;

export function mainStageDayLabel(day: number) {
  return MAIN_STAGE_DAYS.find((row) => row.day === day)?.label ?? `Day ${day}`;
}

/** 0-based index in a group's 7-match round. Matches 1–3 are day 1, 4–7 are day 2. */
export function groupRoundDay(matchIndex: number) {
  return matchIndex < 3 ? 1 : 2;
}

/** Day shown on the schedule. Derived from the match so an older stored day still lines up. */
export function scheduledDay(match: { stage: string; id: string; day: number }) {
  if (match.stage === "playin") return match.day;
  if (match.stage === "group") {
    const n = Number(match.id.split("-").pop());
    if (Number.isFinite(n) && n >= 1) return n <= 3 ? 1 : 2;
  }
  if (match.stage === "qf" || match.stage === "semi" || match.stage === "gf") return KNOCKOUT_DAY;
  return match.day;
}

export const FANO_TRIPLES: [number, number, number][] = [
  [0, 1, 3],
  [1, 2, 4],
  [2, 3, 5],
  [3, 4, 6],
  [4, 5, 0],
  [5, 6, 1],
  [6, 0, 2],
];

export const STYLES = ["front", "pace", "late", "end"] as const;
export type RunStyle = (typeof STYLES)[number];

export const STYLE_LABEL: Record<string, string> = {
  front: "Front Runner",
  pace: "Pace Chaser",
  late: "Late Surger",
  end: "End Closer",
  runaway: "Front Runner",
};

export const QF_SEEDS: { id: string; label: string; picks: [string, number][] }[] = [
  { id: "qf-1", label: "Last Chance Qualifier 1", picks: [["A", 3], ["B", 4], ["C", 5]] },
  { id: "qf-2", label: "Last Chance Qualifier 2", picks: [["B", 3], ["C", 4], ["A", 5]] },
  { id: "qf-3", label: "Last Chance Qualifier 3", picks: [["C", 3], ["A", 4], ["B", 5]] },
];

export const SEMI_SEEDS: {
  id: string;
  label: string;
  first: [string, number];
  second: [string, number];
  qfId: string;
}[] = [
  { id: "semi-1", label: "Semi Final 1", first: ["A", 1], second: ["B", 2], qfId: "qf-3" },
  { id: "semi-2", label: "Semi Final 2", first: ["B", 1], second: ["C", 2], qfId: "qf-1" },
  { id: "semi-3", label: "Semi Final 3", first: ["C", 1], second: ["A", 2], qfId: "qf-2" },
];
