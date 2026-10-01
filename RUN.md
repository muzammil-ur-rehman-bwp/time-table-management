# Running this locally

Two processes: the API server and the React dev server. Run them in two terminals from the
repo root.

## Prerequisites

- Node.js 18+ (tested with Node 22) and npm.

## 1. Backend (Express API)

```bash
cd server
npm install
cp .env.example .env   # optional - defaults already work
npm start               # or: npm run dev   (auto-restarts on file changes)
```

By default it listens on `http://localhost:4000` and reads/writes
`../time-table-fall-2026.json` (the repo-root file). Override either with env vars:

```bash
PORT=4001 DATA_FILE=/path/to/other-timetable.json npm start
```

Check it's alive:

```bash
curl http://localhost:4000/api/health
```

## 2. Frontend (React / Vite)

In a second terminal:

```bash
cd client
npm install
cp .env.example .env   # set VITE_API_URL if the server isn't on localhost:4000
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Everyday workflow

1. `git pull` to pick up the latest `time-table-fall-2026.json` (and any app changes).
2. Start the server (`cd server && npm start`) and the client (`cd client && npm run dev`) as above.
3. Make your changes in the UI. Every create/update/delete writes straight back to
   `time-table-fall-2026.json` in the repo root - the server re-reads the file from disk on
   every request, so it always reflects the latest `git pull` even if you pulled while it was
   running.
4. `git diff` / `git add` / `git commit` / `git push` the updated JSON (and any code changes)
   as usual, from the repo root.

## Production-style build (optional)

```bash
cd client
npm run build      # outputs client/dist - serve it with any static file host
npm run preview    # quick local preview of the built app
```

The server has no build step; `npm start` runs it directly.

## Troubleshooting

- **Client shows "API error: Failed to fetch"**: the server isn't running, or `VITE_API_URL`
  in `client/.env` doesn't match where it's listening.
- **409 on save**: either a scheduling conflict (teacher/room/section double-booked - the UI
  shows which placement it clashes with and offers a "Save anyway" override) or you're trying
  to delete something still referenced elsewhere (e.g. a teacher with existing placements).
- **Port already in use**: set `PORT` (server) or pass `--port` to `vite` (client).
