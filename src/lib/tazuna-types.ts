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
  name: string;
  aliases: string[];
  rarity: string;
};

export type TazunaCatalog = {
  asOf: string;
  commitSha: string | null;
  umas: CatalogUma[];
  skills: CatalogSkill[];
};
