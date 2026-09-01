import { mkdir, readdir, unlink } from "fs/promises";
import path from "path";

export const TEAM_BG_DIR = path.join(process.cwd(), "public", "uploads", "teams");

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function isTeamId(id: string) {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

export function extForMime(type: string) {
  return MIME_EXT[type] ?? null;
}

export function isAllowedBackgroundUrl(value: string) {
  if (value.startsWith("/uploads/teams/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function clearLocalTeamBackground(teamId: string) {
  if (!isTeamId(teamId)) return;
  let files: string[] = [];
  try {
    files = await readdir(TEAM_BG_DIR);
  } catch {
    return;
  }
  await Promise.all(
    files
      .filter((file) => file.startsWith(`${teamId}.`) || file.startsWith(`${teamId}-`))
      .map((file) => unlink(path.join(TEAM_BG_DIR, file)).catch(() => undefined)),
  );
}

export async function ensureTeamBgDir() {
  await mkdir(TEAM_BG_DIR, { recursive: true });
}
