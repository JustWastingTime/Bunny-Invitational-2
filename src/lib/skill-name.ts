/** White ○ and double ◎ marks are the same skill. */
export function plainSkillName(name: string) {
  return name.replace(/[○◎◯]/g, "").replace(/\s+/g, " ").trim();
}
