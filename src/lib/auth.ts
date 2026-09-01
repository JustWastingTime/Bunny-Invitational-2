import type { NextAuthOptions, Session } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { getServerSession } from "next-auth";

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

export function staffIdList(): string[] {
  return (process.env.DISCORD_STAFF_IDS ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function devBypass(): boolean {
  return process.env.DEV_STAFF_BYPASS === "true" && process.env.NODE_ENV !== "production";
}

export const authOptions: NextAuthOptions = {
  providers: process.env.DISCORD_CLIENT_ID
    ? [
        DiscordProvider({
          clientId: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
        }),
      ]
    : [],
  secret: process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me-please-use-a-long-value",
  callbacks: {
    async session({ session, token }) {
      if (session.user) session.user.id = token.sub;
      return session;
    },
  },
};

export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

export async function requireStaff(): Promise<{ ok: true; session: Session | null } | { ok: false; status: number }> {
  if (devBypass()) return { ok: true, session: null };
  const session = await getSession();
  const id = session?.user?.id;
  if (!session || !id) return { ok: false, status: 401 };
  if (!staffIdList().includes(id)) return { ok: false, status: 403 };
  return { ok: true, session };
}

export function isStaffSession(session: Session | null): boolean {
  if (devBypass()) return true;
  const id = session?.user?.id;
  return Boolean(id && staffIdList().includes(id));
}
