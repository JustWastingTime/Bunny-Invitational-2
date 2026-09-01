import { writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  TEAM_BG_DIR,
  clearLocalTeamBackground,
  ensureTeamBgDir,
  extForMime,
  isAllowedBackgroundUrl,
  isTeamId,
} from "@/lib/team-background";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });

  const form = await request.formData();
  const teamId = String(form.get("teamId") ?? "");
  const urlField = String(form.get("url") ?? "").trim();
  const file = form.get("file");

  if (!isTeamId(teamId)) return NextResponse.json({ error: "invalid team" }, { status: 400 });

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (urlField) {
    if (!isAllowedBackgroundUrl(urlField)) {
      return NextResponse.json({ error: "invalid url" }, { status: 400 });
    }
    if (urlField.startsWith("/uploads/teams/") === false) {
      await clearLocalTeamBackground(teamId);
    }
    await prisma.team.update({ where: { id: teamId }, data: { backgroundPath: urlField } });
    return NextResponse.json({ ok: true, backgroundPath: urlField });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file or url required" }, { status: 400 });
  }
  if (file.size > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "image too large" }, { status: 400 });
  }
  const ext = extForMime(file.type);
  if (!ext) return NextResponse.json({ error: "use jpg, png, webp, or gif" }, { status: 400 });

  await ensureTeamBgDir();
  await clearLocalTeamBackground(teamId);
  const filename = `${teamId}-${Date.now()}.${ext}`;
  await writeFile(path.join(TEAM_BG_DIR, filename), Buffer.from(await file.arrayBuffer()));
  const backgroundPath = `/uploads/teams/${filename}`;
  await prisma.team.update({ where: { id: teamId }, data: { backgroundPath } });
  return NextResponse.json({ ok: true, backgroundPath });
}

export async function DELETE(request: Request) {
  const gate = await requireStaff();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: gate.status });
  const teamId = new URL(request.url).searchParams.get("teamId") ?? "";
  if (!isTeamId(teamId)) return NextResponse.json({ error: "invalid team" }, { status: 400 });
  await clearLocalTeamBackground(teamId);
  await prisma.team.update({ where: { id: teamId }, data: { backgroundPath: null } });
  return NextResponse.json({ ok: true, backgroundPath: null });
}
