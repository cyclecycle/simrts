# SimRTS POC

Policy-driven RTS simulation with:
- **Server**: Node.js + Express + WebSocket, authoritative simulation
- **Client**: Vite + TypeScript + Canvas renderer

## Quick start (one command)

From the repo root:

```bash
npm install
npm run dev
```

This starts:
- server on `http://localhost:3000`
- client on `http://localhost:5173`

`npm run dev` first clears stale processes on ports `3000` and `5173`.

Open `http://localhost:5173` in your browser.

To stop both services and free the ports:

```bash
npm run stop
```

## Build checks

From the repo root:

```bash
npm run build
```

This runs:
- server TypeScript check (`tsc --noEmit`)
- client production build

## Fast simulation sanity tests

Run non-realtime simulation assertions (economy/build/production) from the server package:

```bash
npm --prefix server test
```

## Manual subproject commands

```bash
npm --prefix server run dev
npm --prefix client run dev -- --host --port 5173 --strictPort
```

## Deploy (Render free tier)

This repo is set up for a single Render Web Service using [render.yaml](render.yaml).

1. Push your latest code to GitHub.
2. In Render, click **New** → **Blueprint**.
3. Connect your GitHub repo and select this project.
4. Render detects [render.yaml](render.yaml) and creates the service.
5. Wait for deploy to finish, then open the generated `onrender.com` URL.

### Render settings (if creating manually)

- Runtime: `Node`
- Build Command: `npm install && npm --prefix server install && npm --prefix client install && npm --prefix client run build`
- Start Command: `npm --prefix server run start`
- Plan: `Free`

### Post-deploy checks

- App: open your Render URL and click `Start Match`.
- Health: `https://<your-service>.onrender.com/health` should return `ok`.
- WebSocket: match state should update continuously in the UI.
