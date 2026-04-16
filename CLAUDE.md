# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack & layout

Chinese-language full-stack fitness tracker.

- `client/` — React 18 + react-router-dom v6 + recharts (CRA/react-scripts). All copy is Chinese.
- `server/` — Express 4 + Mongoose 7 (Node).
- `docs/` — Chinese product-vision docs (`FitTrack-Pro-Vision.md`, `Product-Strategy-2.0.md`). These are strategy, not spec — they describe an aspirational "FitTrack Pro" with voice control, Apple Watch, etc. that is **not implemented**. Don't treat them as a source of truth for what the code does.

## Common commands

Run from repo root or from each package directory.

```bash
# Backend (server/)
npm install
npm run dev            # nodemon
npm start              # node index.js (prod)

# Frontend (client/)
npm install
npm start              # CRA dev server on :3000
npm run build
npm test               # react-scripts test (no tests written yet)
```

`start-app.bat` spawns both dev servers on Windows (backend :5000, frontend :3000).

There is no linter, formatter, or test suite configured — don't invent one unless asked.

## Environment variables

Server (`server/.env`):
- `MONGODB_URI` — **optional**. If missing or unreachable, the server transparently falls back to `mongodb-memory-server` (data is lost on restart). See `server/index.js:27-48`.
- `JWT_SECRET` — falls back to literal `'secret'` if unset.
- `PAYLOAD_KEY` — AES-256-CBC key for decrypting login/register payloads. Falls back to `'fallback-dev-key'`. **Must match the client's `REACT_APP_PAYLOAD_KEY`** or auth will 400 with `Invalid payload`.
- `PORT` — defaults to 5000.

Client (`client/.env`):
- `REACT_APP_API_URL` — defaults to `http://localhost:5000`.
- `REACT_APP_PAYLOAD_KEY` — must match server's `PAYLOAD_KEY`.

## Architecture notes that span files

**Encrypted auth handshake.** `/api/auth/register` and `/api/auth/login` do not accept `{username, password}` directly. The client encrypts the credentials object with AES-CBC + random IV via `client/src/crypto.js` and POSTs `{ data: "<ivHex>:<ciphertext>" }`. The server's `decryptPayload` middleware (`server/routes/auth.js:12-46`) reverses this. When changing the login/register flow, update **both sides** and keep the `PAYLOAD_KEY` env var aligned. Other endpoints use plain JSON + JWT (`x-auth-token` header).

**Route order is load-bearing in `server/routes/workouts.js`.** Several collection-style routes (`/templates/:templateId`, `/templates/:templateId/use`, `/custom-exercises/:exerciseId`, `/training-plans/:planId`, `/photos/:photoId`, `/day/:date`, `/body-weight`, `/muscle-heatmap`, `/muscle-volume`, `/insights`, `/suggest/:exercise`, `/progress/:exercise`, `/last/:exercise`, `/pr`, `/today`, `/stats`, `/export`, `/reminder`, `/profile`, `/alternatives/:exercise`, `/copy-last-session`, `/streak-shield`) sit in the same router as `/:id` (delete/put by workout id). Routes with literal prefixes **must stay above** the `/:id` handlers or Express will match the wrong handler. The existing file preserves this ordering — respect it when adding routes.

**Exercise → muscle map is the single source of truth for muscle analytics.** `EXERCISE_MUSCLE_MAP` in `server/routes/workouts.js` drives `/muscle-heatmap`, `/muscle-volume`, and `/alternatives/:exercise`. The **exercise name strings must match exactly** between this map and the client's `EXERCISE_LIBRARY` in `client/src/components/AddWorkout.js`. Renaming an exercise in one place silently breaks analytics in the other.

**Mongo persistence is optional in dev.** The in-memory fallback means data vanishes between restarts. Don't assume user/workout state survives a restart unless `MONGODB_URI` is actually set and reachable.

**Progress-photo uploads hit the local filesystem.** `POST /api/workouts/photos` decodes base64 and writes to `server/uploads/photos/`, served statically at `/uploads/*` (see `server/index.js:14`). JSON body limit is 10mb (same file, line 11). Photos are capped at 50 per user; the DB stores only the URL, not the bytes.

**Auth middleware is duplicated.** Both `routes/auth.js` and `routes/workouts.js` define their own local `auth` function that reads `x-auth-token` and verifies the JWT. They are intentionally independent — don't try to DRY them into a shared module without checking both call sites.

**Frontend is four screens, no state library.** `client/src/App.js` holds auth state via `AuthContext` + localStorage `token`. Routes: `/login`, `/register`, `/` (Dashboard), `/add` (AddWorkout). `Dashboard.js` and `AddWorkout.js` are large on purpose — they bundle many sub-features (templates, heatmap, calendar, PR, photos, reminder, swipe-to-delete sheets, etc.). Prefer extending in place over splitting unless the user asks for a refactor.

**Design system via CSS variables.** Colors, radii (`--r-s/m/l/xl`), shadows (`--shadow-l`), and text tiers (`--text-1…4`) are defined in `client/src/index.css` and `App.css`. Components reference them inline (`var(--c-blue)`, `var(--surface)`, etc.). The palette is low-saturation Morandi — reuse tokens rather than hardcoding hex. Dark mode is driven by `@media (prefers-color-scheme: dark)` overrides in the same stylesheet.
