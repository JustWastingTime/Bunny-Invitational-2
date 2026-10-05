export type CatalogUma = {
  id: string;
  spriteId: string;
  name: string;
  characterName: string;
  type: string;
  costume: string;
  aliases: string[];
  thumbnail: string;
  fallbackThumb: string;
};

export type CatalogSkill = {
  id: string;
  name: string;
  aliases: string[];
  rarity: string;
  /** Outfit ids whose own unique skill this is. Used to match the in-game skill list. */
  cards?: string[];
};

export type TazunaCatalog = {
  asOf: string;
  commitSha: string | null;
  umas: CatalogUma[];
  skills: CatalogSkill[];
};
