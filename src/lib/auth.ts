import type { NextAuthOptions, Session } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { getServerSession } from "next-auth";
import { OWNER_DISCORD_ID } from "./constants";
import { rememberAuthFailure } from "./auth-debug";
import { staffDiscordIds } from "./staff-access";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      id?: string;
    };
  }
}

if (!process.env.NEXTAUTH_URL) {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (host) process.env.NEXTAUTH_URL = host.startsWith("http") ? host : `https://${host}`;
}

export function devBypass(): boolean {
  return process.env.DEV_STAFF_BYPASS === "true" && process.env.NODE_ENV !== "production";
}

export function isOwnerId(id: string | null | undefined) {
  return id === OWNER_DISCORD_ID;
}

export async function requireStaff(): Promise<{ ok: true; session: Session | null } | { ok: false; status: number }> {
  if (devBypass()) return { ok: true, session: null };
  const session = await getSession();
  const id = session?.user?.id;
  if (!session || !id) return { ok: false, status: 401 };
  const ids = await staffDiscordIds();
  if (!ids.includes(id)) return { ok: false, status: 403 };
  return { ok: true, session };
}

export async function requireOwner(): Promise<{ ok: true; session: Session | null } | { ok: false; status: number }> {
  if (devBypass()) return { ok: true, session: null };
  const session = await getSession();
  const id = session?.user?.id;
  if (!session || !id) return { ok: false, status: 401 };
  if (!isOwnerId(id)) return { ok: false, status: 403 };
  return { ok: true, session };
}

export const authOptions: NextAuthOptions = {
  providers: process.env.DISCORD_CLIENT_ID
    ? [
        DiscordProvider({
          clientId: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
          // Email is not used. Asking for it makes Discord refuse accounts that have no email.
          authorization: { params: { scope: "identify" } },
          profile(profile) {
            const avatar = typeof profile.avatar === "string" ? profile.avatar : "";
            const image = avatar
              ? `https://cdn.discordapp.com/avatars/${profile.id}/${avatar}.${avatar.startsWith("a_") ? "gif" : "png"}`
              : null;
            return {
              id: profile.id,
              name: profile.global_name || profile.username,
              email: profile.email ?? null,
              image,
            };
          },
        }),
      ]
    : [],
  secret: process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me-please-use-a-long-value",
  pages: { signIn: "/login", error: "/login" },
  logger: {
    error(code, metadata) {
      const meta =
        metadata instanceof Error
          ? { error: metadata }
          : (metadata as { error?: unknown; error_description?: unknown } | undefined);
      const error = meta?.error;
      const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
      const description = typeof meta?.error_description === "string" ? meta.error_description : "";
      const detail = [message, description].filter(Boolean).join(" — ") || String(code);
      rememberAuthFailure(String(code), detail);
      console.error(`[auth] ${code}: ${detail}`);
    },
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.providerAccountId) token.sub = account.providerAccountId;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.sub;
      return session;
    },
  },
};

export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

export async function isStaffSession(session: Session | null): Promise<boolean> {
  if (devBypass()) return true;
  const id = session?.user?.id;
  if (!id) return false;
  const ids = await staffDiscordIds();
  return ids.includes(id);
}

export function canOpenSettings(session: Session | null): boolean {
  if (devBypass()) return true;
  return isOwnerId(session?.user?.id);
}
