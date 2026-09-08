# Bunny Invitational 2

Public tournament site plus a staff desk and an OBS overlay. Scores live in a database — no GitHub JSON pushes.

## Stack

- Next.js (App Router) + Tailwind
- Prisma + SQLite locally (Postgres on Vercel, e.g. Neon)
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

Staff access is **Discord accounts whose user IDs are listed in `DISCORD_STAFF_IDS`**. That env var is required in production.

1. Create a Discord application and set the redirect to `https://your-domain/api/auth/callback/discord` (and `http://localhost:3000/api/auth/callback/discord` for local).
2. Put the client id/secret in env.
3. Set `DISCORD_STAFF_IDS` to a comma-separated list of Discord user snowflakes (Discord → Settings → Advanced → Developer Mode, then right-click a user → Copy User ID).
4. Leave `DEV_STAFF_BYPASS` unset or `false` on Vercel. It only works in local `next dev`.

## Deploy on Vercel

1. Create a Neon (or other) **Postgres** database. Copy the pooled connection string.
2. Import the repo in Vercel. Set these **environment variables** (Production, and Preview if you want staff login on previews):

| Name | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon **pooled** Postgres URL (`-pooler` in the host). SQLite will fail the Vercel build. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | strongly recommended | Upstash Redis (not labeled “KV” in Vercel). Overlay director writes here so OBS does not wait on Postgres. |
| `NEXTAUTH_SECRET` | yes | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | yes | Canonical site URL, e.g. `https://your-app.vercel.app` |
| `DISCORD_CLIENT_ID` | yes for staff | Discord app OAuth2 |
| `DISCORD_CLIENT_SECRET` | yes for staff | Discord app OAuth2 |
| `DISCORD_STAFF_IDS` | yes for staff | Comma-separated Discord user IDs |
| `DEV_STAFF_BYPASS` | no | Must not be `true` in production |
| `GITHUB_TOKEN` | no | Higher GitHub rate limit for uma catalog |
| `TAZUNA_AS_OF` | no | Freeze catalog date |

3. Add the Vercel URL to the Discord OAuth redirect list.
4. Deploy. The build runs `prisma db push` so tables exist.
After the first deploy, copy **your local SQLite data** into Neon (do not use `prisma db seed` — that is demo clubs):

```powershell
$env:PROD_DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
npm run db:copy-prod
```

Team background **file uploads** do not persist on Vercel’s filesystem. Use a hosted image URL in the staff team editor, or re-upload after each deploy only for local/dev.

The OBS route stays independent of site dark mode so the browser source stays transparent.

### Overlay director lag

Vercel + Neon + Redis is a bad fit for a live director. Staff in Southeast Asia, functions in the US, and Redis HTTP on every click/poll will feel worse than local. **A $6 DigitalOcean droplet in Singapore** with `npm run build && npm start` (SQLite, no Redis) is the right host: one Node process, overlay state in memory, OBS and the phone hit the same machine.

You can leave the site on Vercel for the public pages and point OBS + `/staff/overlay` at the droplet, or move the whole app. Set `NEXTAUTH_URL` to the droplet URL and add that Discord redirect.

Skip Upstash on the droplet. Redis is only a workaround for serverless, not a speedup.

## Pages

| Path | Who |
|---|---|
| `/` `/rules` `/teams` `/schedule` `/scoreboard` `/stats` | Audience |
| `/staff` `/staff/groups` `/staff/scores` `/staff/overlay` `/staff/teams/[id]` | Staff |
| `/obs` | OBS browser source (director-controlled) |
