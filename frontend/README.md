# AITrader Frontend (SPA)

This document describes the single-page application (SPA) frontend for AITrader, its features, directory layout, development workflow, and how it integrates with the backend services.

Instruction source: `.github/instructions/copilot-instructions.instructions.md`

## Purpose

The SPA is a lightweight control panel for monitoring system components, visualizing model predictions, reviewing sentiment, launching training, and inspecting the database and execution flows. It's built with React + Vite + TypeScript and uses Tailwind for styling.

## Quick start (development)

Requirements: Node 18+, npm, Docker (for proxy/backends)

1. Install dependencies:

   npm install

2. Run dev server:

   npm run dev

3. Open the app at `http://localhost:5173` (dev) or `http://localhost:8080` when using Docker/nginx via `docker compose -f docker-compose.dev.yml up -d settings settings-api`.

## Build for production

1. Build the SPA:

   npm run build

2. The `dist/` output will be copied by the `frontend/Dockerfile` into the nginx image used by `settings` in `docker-compose.dev.yml`.

## Test

Run unit/smoke tests:

  npm test

## Features (top-level)

- Monitor (home) — realtime system and component status, GPU metrics, ONNX Runner status, inference latency.
- Signals — table of signals (sparklines, ranking, filters, symbol drilldown).
- Predictions — model predictions and forecasts with history and confidence bands.
- Sentiment — symbol sentiment dashboard powered by FinBERT results.
- Executions — order entry UI and execution history.
- Training — training control panel for ML runs (N-BEATS, etc.).
- Metrics / DB — Prometheus metrics links and database exploration tools.

## Integration points

- Backend API base: `/api/` (proxied to `settings-api` in dev compose)
- WebSocket monitor: `/api/ws/monitor` (server pushes component updates)

## Development notes

- Tailwind is processed during `npm run build` / `vite dev`. The `src/styles.css` contains Tailwind directives.
- If serving `dist/` via nginx, ensure asset paths match (the built index may reference `/ui/*` depending on the build base). See `frontend/nginx.conf`.

## Where to add features

- Add API clients to `src/api/` (e.g., `predictionsClient.ts`, `sentimentClient.ts`).
- Add hooks to `src/hooks/` (e.g., `useSignals.ts`, `usePredictions.ts`, `useSentiment.ts`).
- Add pages to `src/pages/` (e.g., `MonitorPage.tsx`, `SignalsPage.tsx`, `PredictionsPage.tsx`).
- Add components under `src/components/` grouped by feature.

## Contributing

Follow the repository `.github` guidelines; add tests for any new UI features and keep PRs small. Avoid committing large build artifacts or node_modules.
Frontend SPA placeholder. Use React + Vite. Pages: Home (monitor), Execution, Database, Settings, Strategies.
WebSocket connect to backend `/api/ws/monitor` for realtime status.