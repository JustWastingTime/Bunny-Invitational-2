export type PublicPlacement = {
  place: number;
  teamId: string;
  teamName: string;
  teamColor: string;
  slot: number;
  trainer: string;
  umaName: string;
  spriteId: string;
  spritePath: string | null;
  base: number;
  penalty: number;
  uniqueBonus: number;
  net: number;
};

export type PublicRace = {
  category: string;
  label: string;
  placements: PublicPlacement[];
};

export type PublicMatchTeam = {
  slot: number;
  teamId: string | null;
  name: string;
  shortName: string;
  color: string;
  points: number;
};

export type PublicMatch = {
  id: string;
  stage: string;
  group: string | null;
  day: number;
  sortOrder: number;
  label: string;
  setNumber: number | null;
  complete: boolean;
  winnerId: string | null;
  teamPoints: Record<string, number>;
  teams: PublicMatchTeam[];
  races: PublicRace[];
};

export type PublicUma = {
  category: string;
  slot: number;
  trainer: string;
  umaName: string;
  spriteId: string;
  spritePath: string | null;
  rating: string | null;
  style: string | null;
  styleLabel: string | null;
  aptitudes: { terrain: string | null; distance: string | null; style: string | null };
  stats: { speed: number; stamina: number; power: number; guts: number; wisdom: number };
  skills: string[];
  isUnique: boolean;
  popularityRank: number | null;
  pickCount: number;
};

export type PublicTeam = {
  id: string;
  name: string;
  shortName: string;
  tagline: string | null;
  color: string;
  backgroundPath: string | null;
  group: string | null;
  groupSlot: number | null;
  kind: "main" | "playin";
  roster: PublicUma[];
};

export type GroupStandingRow = {
  teamId: string;
  points: number;
  wins: number;
  firsts: number;
  matchesPlayed: number;
  rank: number;
  name: string;
  shortName: string;
  color: string;
};

export type Cue = {
  matchId: string;
  matchLabel: string;
  category: string;
  categoryLabel: string;
  teams: { name: string; color: string }[];
} | null;

export type PublicPayload = {
  tournament: string;
  updatedAt: string;
  scoring: { place: Record<number, number>; uniqueBonus: number; popular: Record<number, number> };
  overlay: {
    activeMatchId: string | null;
    activeCategory: string;
    view: string;
    visible: boolean;
    gates: { teamId: string; slot: number; gate: number }[];
    gatesAll: Record<string, number>;
    focus: { teamId: string; slot: number } | null;
  };
  now: Cue;
  next: Cue;
  teams: PublicTeam[];
  matches: PublicMatch[];
  groups: { id: string; standings: GroupStandingRow[] }[];
  grandFinal: { rank: number; teamId: string; name: string; shortName: string; color: string; points: number }[];
  stats: {
    uniqueCount: number;
    mostPopular: { name: string; count: number; spriteId: string } | null;
    mostPopularCombined: { name: string; count: number } | null;
    umaPopulation: {
      spriteId: string;
      name: string;
      baseName: string;
      count: number;
      starts: number;
      wins: number;
      top5: number;
      unique: boolean;
      popularityRank: number | null;
      winRate: number;
      top5Rate: number;
    }[];
    skillsCommon: { name: string; count: number }[];
    skillsRare: { name: string; count: number }[];
    teamPowerByStats: { teamId: string; name: string; shortName: string; color: string; totalStats: number; skills: number; uniquePicks: number }[];
    teamPowerBySkills: { teamId: string; name: string; shortName: string; color: string; totalStats: number; skills: number; uniquePicks: number }[];
    mostUniqueTeam: { teamId: string; name: string; uniquePicks: number } | null;
  };
};
