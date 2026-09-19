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

### OBS scene switching (director on Vercel)

The director can't touch OBS directly: a page served over HTTPS is not allowed to
open an insecure `ws://127.0.0.1:4455` socket, and OBS's browser source has the
same restriction. It also can't be a Vercel function, because OBS is not on the
internet. Something must run **on the streaming PC**.

`scripts/obs-bridge.mjs` is that piece. It reads the same public on-air state the
`/obs` browser source renders and mirrors it onto OBS:

| Director action | OBS result |
|---|---|
| Show Race | program scene -> **Uma** |
| Show Match Up | program scene -> **Cast** |
| Sprint / Mile / Medium / Long / Dirt | that category's source on, the other four off, in both **Uma** and **Cast** |

Show Scoreboard, Show Group Table, and Show Pause are left alone until you map
them (see `OBS_SCENE_MAP`). Hiding the overlay leaves OBS as-is.

One-time OBS setup:

1. **Tools -> WebSocket Server Settings** -> tick *Enable WebSocket server*. Note
   the port (4455) and password.
2. Have scenes named exactly **Uma** and **Cast**.
3. In each scene, have one source per distance named exactly **Sprint**, **Mile**,
   **Medium**, **Long**, **Dirt**. Groups are fine — the bridge looks inside them.
   Different names? Point `OBS_CATEGORY_SOURCES` at yours.

Then, on the streaming PC:

```powershell
$env:APP_URL="https://your-app.vercel.app"
$env:OBS_PASSWORD="the-password-from-step-1"
npm run obs:bridge
```

Verify it before a show with `npm run obs:bridge -- --once`, which applies one
state and exits non-zero if OBS is unreachable. Leave the plain command running
during the event (keep the terminal open, or register it in Task Scheduler / pm2).
The bridge has no dependencies — it uses the built-in WebSocket and crypto in
Node 22+.

| Env | Default | Purpose |
|---|---|---|
| `APP_URL` | `http://localhost:3000` | Where the live state is read from |
| `OBS_STATE_URL` | `$APP_URL/api/overlay/live` | Full override of the state URL |
| `OBS_URL` | `ws://127.0.0.1:4455` | obs-websocket endpoint |
| `OBS_PASSWORD` | empty | Required if OBS has a password set |
| `OBS_SCENE_MAP` | `{"race":"Uma","matchup":"Cast"}` | View -> scene; add `"scoreboard"`, `"groups"`, `"pause"` entries to map those too |
| `OBS_CATEGORY_SOURCES` | `{"sprint":["Sprint"],...}` | Category -> source names; a category may list several names |
| `OBS_TOGGLE_SCENES` | the mapped scenes | Which scenes get the category sources |
| `OBS_POLL_MS` | `750` | State poll interval |


## Pages

| Path | Who |
|---|---|
| `/` `/rules` `/teams` `/schedule` `/scoreboard` `/stats` | Audience |
| `/staff` `/staff/groups` `/staff/scores` `/staff/overlay` `/staff/teams/[id]` | Staff |
| `/obs` | OBS browser source (director-controlled) |
