const GAMETORA_SPRITES = "https://gametora.com/images/umamusume/characters";

function spriteFile(spriteId: string | number | null | undefined) {
  if (spriteId === null || spriteId === undefined || spriteId === "") return null;
  const id = String(spriteId).replace(/\D/g, "");
  if (!id) return null;
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  return `chara_stand_${Math.floor(n / 100)}_${id}.png`;
}

/** Standee used everywhere. Gametora is the source the team editor already recovers when a local file is missing. */
export function spriteFileName(spriteId: string | number | null | undefined): string | null {
  const file = spriteFile(spriteId);
  return file ? `${GAMETORA_SPRITES}/${file}` : null;
}

export function spriteLocalPath(spriteId: string | number | null | undefined): string | null {
  const file = spriteFile(spriteId);
  return file ? `/characters/${file}` : null;
}

export function parseSkills(skillsJson: string | null | undefined): string[] {
  if (!skillsJson) return [];
  try {
    const parsed = JSON.parse(skillsJson);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return skillsJson
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
