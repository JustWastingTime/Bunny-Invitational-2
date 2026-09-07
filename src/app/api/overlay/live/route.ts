import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { overlayFromRow } from "@/lib/overlay-gates";
import { noStoreHeaders } from "@/lib/no-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const row = await prisma.overlayState.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
  const overlay = overlayFromRow(row);
  return NextResponse.json(
    { overlay, stamp: overlay.stamp },
    { headers: noStoreHeaders() },
  );
}
