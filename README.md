# Bunny Invitational 2

Public tournament site plus a staff desk and an OBS overlay. Scores live in a database — no GitHub JSON pushes.

## Stack

- Next.js (App Router) + Tailwind
- Prisma + SQLite locally (switch to Neon Postgres for Vercel)
- Discord login (Auth.js / NextAuth) with a staff user-ID allowlist

## Local setup

```bash
npm install
copy .env.example .env
npx prisma db push
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Staff desk: [http://localhost:3000/staff](http://localhost:3000/staff) (dev bypass is on by default). OBS: [http://localhost:3000/obs](http://localhost:3000/obs) at 1920×1080.

## Discord staff login

1. Create a Discord application and set the redirect to `https://your-domain/api/auth/callback/discord` (and `http://localhost:3000/api/auth/callback/discord` for local).
2. Put the client id/secret in env.
3. Set `DISCORD_STAFF_IDS` to a comma-separated list of Discord user snowflakes.
4. Set `DEV_STAFF_BYPASS=false` in production.

## Vercel + Neon

1. Create a Neon database and copy the connection string.
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
3. Set `DATABASE_URL` (and `NEXTAUTH_SECRET`, Discord vars) in the Vercel project.
4. Build command can stay `prisma generate && prisma db push && next build` (or run `db push` / migrate once).

## Pages

| Path | Who |
|---|---|
| `/` `/rules` `/teams` `/schedule` `/scoreboard` `/stats` | Audience |
| `/staff` `/staff/groups` `/staff/scores` `/staff/overlay` `/staff/teams/[id]` | Staff |
| `/obs` | OBS browser source (director-controlled) |
