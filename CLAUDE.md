# CodeCortex3.0

Event platform for TAM-VIT's Code Cortex 3.0 hackathon. **This repo holds two
separate applications that do not share code, dependencies, or a build.** Know which
one you are in before changing anything.

| Path | What it is | Dev command | Port |
|---|---|---|---|
| `/` (root: `src/`, `index.html`) | Registration + dashboards SPA. React 19, Vite 8, Google OAuth. | `npm run dev` | 5173 |
| `/server` | REST API. Express 5, **Google Sheets as the database**. | `node index.js` | 3000 |
| `/frontend` | The public event website. Manus-generated: React 19 + Vite 7, Express + tRPC, Drizzle/MySQL. Self-contained. | `npm run dev` | 3000 |

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

Generated on the Manus WebDev platform, so it assumes infrastructure that does not
exist locally. Its own `package.json`, pnpm lockfile, tsconfig and Vite config —
treat it as a nested project.

- `frontend/client/` is the Vite root; `frontend/client/public/` is `publicDir`, served from `/`.
- Nearly all site copy is hardcoded JSX in `client/src/pages/Home.tsx` (~707 lines). Extracted data is limited to the top-of-file `navItems`, `tracks`, `nominationOptions`, `faqs` arrays. Styling is one `client/src/index.css`.
- `frontend/server/_core/` is vendor code. Prefer editing `server/routers.ts`, `server/db.ts`, `server/teamAuth.ts`.
- Aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*`.

### The `/manus-storage/` asset path

Assets referenced as `/manus-storage/<name>` are not files in the repo. `storageProxy.ts`
resolves them by asking a Manus "Forge" API for a presigned URL using
`BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY`, which only exist inside the Manus
sandbox. Without them the route returns **500**, which surfaces as
`Could not load /manus-storage/....glb`.

`storageProxy.ts` has been patched to check disk first — `frontend/public/assets/`
(note: NOT a Vite folder, only the proxy reads it) and `frontend/client/public/manus-storage/`.
Present in `public/assets/`: the mascot `.glb`, Code Cortex logo, data-alchemy cover,
team photo, TAM white logo. **Still missing:** `devjams-orbit-sphere_1b14088e.png`,
`devjams-track-objects_36355203.png`, `code-cortex-siren-ambience_89aed583.wav`,
`polyfab-logo_54e76553.png`.

New assets go in `frontend/client/public/` with a plain path (`/codecortex-3.0.svg`).
Do not add new `/manus-storage/` references.

### frontend env (`frontend/.env`, gitignored)

`JWT_SECRET` (HS256 session key — empty by default, which breaks signing),
`DATABASE_URL` (MySQL; `db.ts` no-ops without it, drizzle-kit throws),
`OAUTH_SERVER_URL` + `VITE_APP_ID` (Manus-issued; absent = OAuth errors at boot, non-fatal),
`OWNER_OPEN_ID` (gates `adminProcedure`).

Expected noise on boot without them: `[OAuth] ERROR: OAUTH_SERVER_URL is not configured`,
`[Auth] Missing session cookie` once per request, and a `baseline-browser-mapping`
staleness warning from a browserslist transitive dep. All harmless.

### Known bug, not yet fixed

`frontend/server/_core/cookies.ts` returns `sameSite: "none"` with `secure: false` on
http://localhost. Browsers silently discard that combination, so no login cookie ever
persists locally and team login appears to succeed but never sticks. Fix: fall back to
`sameSite: "lax"` when the host is local and the request is not HTTPS.

---

## Security

`server/teamPasswords.json` is **committed and contains 27 team passwords in plaintext**
in a public repository. `.gitignore` covers `.env` and `credentials.json` but not this
file. It needs to be removed from tracking, purged from history, and replaced with
hashed storage — `frontend/server/teamAuth.ts` already has a scrypt hash/verify pair
worth copying. Until then, treat every password in it as public.

## Conventions

- Two `npm install`s minimum (root and `server/`), three if you work on `frontend/` (pnpm there).
- Root app: eslint flat config, `npm run lint` before committing.
- `frontend/`: prettier (`npm run format`), Radix primitives under `client/src/components/ui/`, wouter for routing, tRPC + TanStack Query for data. Reuse rather than adding dependencies.
- There is no `.env.example` anywhere. Adding one would save the next person a lot of time.
