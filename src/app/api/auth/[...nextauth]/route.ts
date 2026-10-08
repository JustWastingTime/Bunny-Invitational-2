import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";

const auth = NextAuth(authOptions) as (req: unknown, res: unknown) => Promise<unknown>;

function parseCookie(header: string) {
  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (!name) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      cookies[name] = decodeURIComponent(raw);
    } catch {
      cookies[name] = raw;
    }
  }
  return cookies;
}

function nodeResponse() {
  const headers = new Map<string, string | string[]>();
  let statusCode = 200;
  let payload: unknown;
  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    setHeader(name: string, value: string | string[]) {
      headers.set(name.toLowerCase(), value);
      return res;
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
    json(data: unknown) {
      payload = data;
      headers.set("content-type", "application/json");
      return res;
    },
    send(data: unknown) {
      payload = data;
      return res;
    },
    end() {
      return res;
    },
  };
  return {
    res,
    toResponse() {
      const response = new Response(payload == null ? null : typeof payload === "string" ? payload : JSON.stringify(payload), {
        status: statusCode,
      });
      for (const [name, value] of headers) {
        if (Array.isArray(value)) {
          for (const item of value) response.headers.append(name, item);
        } else {
          response.headers.set(name, value);
        }
      }
      return response;
    },
  };
}

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
  const query: Record<string, string | string[]> = Object.fromEntries(req.nextUrl.searchParams);
  query.nextauth = nextauth;
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const { res, toResponse } = nodeResponse();
  await auth(
    {
      method: req.method,
      headers,
      body: await readBody(req),
      query,
      cookies: parseCookie(req.headers.get("cookie") ?? ""),
    },
    res,
  );
  return toResponse();
}

export { handle as GET, handle as POST };
