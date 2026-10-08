import { createRequire } from "node:module";
import path from "node:path";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";

const require = createRequire(import.meta.url);
const nextAuthDir = path.dirname(require.resolve("next-auth"));
const { AuthHandler } = require(path.join(nextAuthDir, "core/index.js")) as {
  AuthHandler: (params: {
    req: Record<string, unknown>;
    options: typeof authOptions;
  }) => Promise<{ status?: number; cookies?: unknown; redirect?: string }>;
};
const { toResponse } = require(path.join(nextAuthDir, "next/utils.js")) as {
  toResponse: (res: unknown) => Response;
};
const { parse: parseCookie } = require("cookie") as {
  parse: (header: string) => Record<string, string>;
};

async function readBody(req: NextRequest) {
  if (req.method !== "POST") return undefined;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return req.json();
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(await req.text()));
  }
  return undefined;
}

async function handle(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  const nextauth = (await context.params)?.nextauth ?? [];
  const query = Object.fromEntries(req.nextUrl.searchParams);
  const body = (await readBody(req)) as { json?: string } | undefined;
  const internal = await AuthHandler({
    options: authOptions,
    req: {
      body,
      query,
      cookies: parseCookie(req.headers.get("cookie") ?? ""),
      headers: Object.fromEntries(req.headers),
      method: req.method,
      action: nextauth[0],
      providerId: nextauth[1],
      error: query.error ?? nextauth[1],
    },
  });
  const response = toResponse(internal);
  const redirect = response.headers.get("Location");
  if (body?.json === "true" && redirect) {
    response.headers.delete("Location");
    response.headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify({ url: redirect }), {
      status: internal.status ?? 200,
      headers: response.headers,
    });
  }
  return response;
}

export { handle as GET, handle as POST };
