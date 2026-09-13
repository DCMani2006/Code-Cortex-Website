# CodeCortex3.0

Event platform for TAM-VIT's Code Cortex 3.0 hackathon. **This repo holds two
separate applications that do not share code, dependencies, or a build.** Know which
one you are in before changing anything.

| Path | What it is | Dev command | Port |
|---|---|---|---|
| `/` (root: `src/`, `index.html`) | Registration + dashboards SPA. React 19, Vite 8, Google OAuth. | `npm run dev` | 5173 |
| `/server` | REST API. Express 5, **Google Sheets as the database**. | `node index.js` | 3000 |
| `/frontend` | The public event website. Started as a Manus-generated scaffold; Manus infra (asset proxy, OAuth, MySQL/Drizzle) has since been stripped out. React 19 + Vite 7, Express + tRPC, no database. Self-contained. | `npm run dev` | 3000 |

`server/` and `frontend/` both want port 3000. `frontend`'s server auto-increments to
the next free port, so if you start the backend first the site lands on 3001 — but
`src/services/api.ts` hardcodes `http://localhost:3000/api`, so the backend must own
3000. Start it first.

---

## Root SPA (`src/`)

- `src/components/LandingPage.tsx`, `ParticipantDashboard.tsx`, `AdminDashboard.tsx` — the three screens.
- `src/services/api.ts` — every backend call. `API_BASE` is hardcoded to localhost; make it an env var before deploying.
- `src/types/database.ts` — `User`, `Team`, `Submission`, `ReviewScore`. These mirror the Google Sheet columns.
- Auth is `@react-oauth/google` + `jwt-decode` on the client, posting to `/api/auth`.
- `npm run lint` (eslint 10, flat config). `npm run build` runs `tsc -b` first, so type errors block the build.
- README.md is still the stock Vite template text — ignore it.

## Backend (`server/`)

Plain ESM, no framework beyond Express. No test script, no dev script — run it with
`node index.js` from inside `server/`. Its `package.json` is separate; `npm install`
there too.

**The database is a Google Spreadsheet.** `googleSheets.js` authenticates with a
service-account JWT (`google-auth-library`) and opens `process.env.GOOGLE_SHEET_ID`
via `google-spreadsheet`. Tabs used, by exact title:

- `Users`
- `Team` — singular, deliberately; a comment in the file calls this out
- `Submissions`
- `Reviews_Scores`

Adding a field means adding a column in the sheet AND updating `src/types/database.ts`.
Row reads are full-sheet scans, so avoid calling these endpoints in a loop.

Routes in `index.js`: `/api/users`, `/api/auth`, `/api/login`, `/api/teams`,
`/api/teams/auth`, `/api/teams/join`, `/api/teams/:teamId/members`,
`/api/submissions`, `/api/reviews`.

`teamPasswords.js` keeps team passwords in `teamPasswords.json`, a flat file beside
the source. See the security note below before touching it.

**Env** (`server/.env`, gitignored): `GOOGLE_SHEET_ID`, the service-account
credentials (`credentials.json`, also gitignored), `PORT`. The service account's email
must be shared on the spreadsheet or every call 403s.

## Event website (`frontend/`)

Started as a Manus WebDev scaffold. That infrastructure has been removed: no more
`storageProxy.ts` (the `/manus-storage/` asset proxy), no OAuth, no MySQL/Drizzle —
there is no database in this app at all. What's left is a self-contained
Express + tRPC app with its own `package.json`, pnpm lockfile, tsconfig and Vite
config — still treat it as a nested project.

- `frontend/client/` is the Vite root; `frontend/client/public/` is `publicDir`, served from `/`.
- Nearly all site copy is hardcoded JSX in `client/src/pages/Home.tsx` (~707 lines). Extracted data is limited to the top-of-file `navItems`, `tracks`, `nominationOptions`, `faqs` arrays. Styling is one `client/src/index.css`. The "dataset" links point straight at Google Drive file/folder URLs (`driveFileDownloadUrl` for files; folder links just open Drive's folder view).
- `frontend/server/_core/` is vendor/framework code (trpc, vite dev/prod wiring). App logic lives in `server/routers.ts`, `server/spotifyRouter.ts`, `server/spotify.ts`, `server/votes.ts`.
- Aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*`.
- Port: `_core/index.ts` tries `PORT` (default 3000) and auto-increments up to 20 times if busy — this is where the "server/ must claim 3000 first" rule in the table above comes from.

### Song-vote feature (Spotify + flat-file storage)

`server/spotify.ts` calls the Spotify Web API with the Client Credentials flow
(catalog search only — no user login, no playback/queue control). `server/votes.ts`
implements a "pick the next track" poll: one vote per browser, tracked via an
anonymous, non-sensitive cookie (`cc_voter_id`), stored in
`frontend/server/data/song-votes.json` — a flat JSON file, gitignored, the same
pattern as `server/teamPasswords.json` in the root server. No database.

### frontend env (`frontend/.env`, gitignored — `.env.example` exists, copy it)

`VITE_MAIN_APP_URL` (points at the root SPA — "TEAM LOGIN"/"ADMIN" header links go
here), `VITE_ANALYTICS_ENDPOINT` + `VITE_ANALYTICS_WEBSITE_ID` (optional, both must be
set to inject the analytics script), `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET`
(from developer.spotify.com/dashboard, needed for song search to work).

---

## Security

`server/teamPasswords.json` is **committed and contains 27 team passwords in plaintext**
in a public repository. `.gitignore` covers `.env` and `credentials.json` (and, more
recently, `frontend/server/data/`) but not this file. It needs to be removed from
tracking, purged from history, and replaced with hashed storage — Node's built-in
`crypto.scrypt`/`scryptSync` is enough, no dependency needed. Until then, treat every
password in it as public.

## Deployment

Three deployables, two hosts:

- **Root SPA (`/`) → Vercel.** Pure static Vite build (`npm run build` → `dist/`),
  no persistence needed — Vercel's free tier and CDN are the right fit. Set
  `VITE_API_BASE_URL` (the `server/` deployment's URL + `/api`) and
  `VITE_GOOGLE_CLIENT_ID` as Vercel project env vars.
- **`server/` → Railway.** `npm start` runs `node index.js`. Needs a mounted
  persistent volume, because two things write to local disk at runtime:
  - `TEAM_PASSWORDS_DIR` → volume path (else `server/teamPasswords.json` resets
    on every redeploy, silently invalidating every team's password).
  - `GOOGLE_CREDENTIALS_JSON` → paste the service-account key JSON here instead
    of `credentials.json` (gitignored, so it isn't in the git-built image).
  - Also set `GOOGLE_SHEET_ID`.
- **`frontend/` → Railway**, second service, same project. `npm run build` then
  `npm start`. Also needs a volume:
  - `VOTES_DATA_DIR` → volume path (else the song-vote leaderboard resets on
    every redeploy).
  - Also set `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `VITE_MAIN_APP_URL`
    (the root SPA's public URL).

Why two providers instead of one: the root SPA is stateless and static, so a
CDN-first host (Vercel) beats a container host for it; the other two are
long-running Node processes with local file state, which Railway's persistent
volumes handle and serverless platforms don't. Why not a third provider per
app: keeping the two stateful services on one Railway project means one
dashboard for both sets of secrets and volumes.

DNS, once each service has a custom domain attached in its provider dashboard:
point the root domain (or a subdomain) at Vercel per its instructions (usually
an `A`/`ALIAS` record or `CNAME`), and point separate subdomains (e.g.
`api.` and `live.` or similar) at each Railway service via `CNAME`.

## Conventions

- Two `npm install`s minimum (root and `server/`), three if you work on `frontend/` (pnpm there).
- Root app: eslint flat config, `npm run lint` before committing.
- `frontend/`: prettier (`npm run format`), Radix primitives under `client/src/components/ui/`, wouter for routing, tRPC + TanStack Query for data. Reuse rather than adding dependencies.
- `.env.example` exists at the root and in `frontend/`; `server/.env.example` was the last gap and has been added.
