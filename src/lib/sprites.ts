export function spriteFileName(spriteId: string | number | null | undefined): string | null {
  if (spriteId === null || spriteId === undefined || spriteId === "") return null;
  const id = String(spriteId).replace(/\D/g, "");
  if (!id) return null;
  const n = Number(id);
  if (!Number.isFinite(n)) return `/characters/${id}.png`;
  const family = Math.floor(n / 100);
  return `/characters/chara_stand_${family}_${id}.png`;
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
