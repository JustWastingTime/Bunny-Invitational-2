export const TOURNAMENT_NAME = "Bunny Invitational 2";
/** Roster lock — Tazuna uma/skill catalog is snapshotted as of this date unless overridden. */
export const TOURNAMENT_CATALOG_DATE = "2026-09-12";
/** Public site: team/stats pages, real umas, and live match cues. Staff desk is unchanged. */
export const PUBLIC_TOURNAMENT_LIVE = false;

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
export const PLAY_IN_EVENT_LABEL = "Sat 3 Oct 2026, 10:00 PM ICT";

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
