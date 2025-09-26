Instruction source: `.github/instructions/copilot-instructions.instructions.md`

# Frontend Development & Feature Guide — AITrader SPA

This document is the canonical design reference and developer guide for the frontend SPA. It explains pages, components, APIs, WebSocket event shapes, testing recommendations, deployment notes, and — importantly — where and how to add comments and JSDoc so future contributors understand feature intent and data flow.

Use this file as a living reference. Keep comments and example shapes up to date as you implement features.

## What this file adds beyond the ASCII tree

- Concrete examples of API client shapes and expected JSON responses.
- WebSocket event examples and TypeScript types to copy into `src/types.ts` or individual modules.
- Commenting and JSDoc conventions for files and components so reviewers can quickly understand behavior.
- Testing guidance for unit tests (Vitest) and a suggested structure for small integration/E2E tests.
- Deployment reminders for the nginx `ui` alias and WebSocket proxy headers.

## Conventions and commenting guidance

- File-level JSDoc: every module (especially in `src/api/*`, `src/hooks/*`, and `src/components/*`) should start with a short JSDoc block describing purpose, inputs, outputs, and side effects. Example (top of file):

  /**
   * Health client — small typed wrapper around fetch for `/api/health` calls.
   * Inputs: none for snapshot, optional params for filtering.
   * Outputs: { status: 'ok' | 'degraded' | 'down', timestamp: string }
   * Errors: throws on non-2xx responses with a typed Error containing `status` and `body`.
   */

- Function JSDoc: for exported hooks and major helpers, include param and return shapes, and note async behavior.

- Inline comments: explain non-obvious business rules (e.g., "we cap reconnect backoff at 30s to avoid rate-limiting the monitor service"). Keep them short and near the logic they describe.

- Type-focused files: create `src/types.ts` with shared TypeScript interfaces for API responses and WebSocket payloads. Import from there rather than duplicating shapes.

- Code example for a component header comment:

  /**
   * ComponentCard — small presentational card used on Monitor page.
   * Props: { id: string, name: string, status: 'ok'|'warn'|'error', onRestart?: () => Promise<void> }
   * Notes: stateless; calls onRestart when user triggers a restart action.
   */

## Recommended file layout (expanded)

frontend/
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.cjs
├── postcss.config.cjs
├── dist/                      # build output (gitignored)
├── src/
│   ├── main.tsx               # app entry: mount, global providers, routing
│   ├── styles.css             # Tailwind entry and small utility classes
│   ├── types.ts               # shared TS interfaces & event shapes
│   ├── api/
│   │   ├── client.ts          # fetch wrapper, error handling, JSON helpers
│   │   ├── healthClient.ts
│   │   ├── signalsClient.ts   # TODO: implement; includes pagination helpers
│   │   ├── predictionsClient.ts
│   │   └── sentimentClient.ts
│   ├── hooks/
│   │   ├── useWebSocket.ts    # typed events, reconnect/backoff, lastEvent ref
│   │   ├── useSystemStatus.ts # fetch snapshot + fallback to fixtures in dev
│   │   ├── useSignals.ts
│   │   └── usePredictions.ts
│   ├── fixtures/
│   │   └── system_status.json
│   ├── components/
│   │   ├── layout/
│   │   │   └── TopNav.tsx
│   │   ├── monitor/
│   │   │   └── ComponentCard.tsx
│   │   ├── signals/
│   │   │   └── SignalsTable.tsx
│   │   └── predictions/
│   │       └── ForecastChart.tsx
│   └── pages/
│       ├── MonitorPage.tsx
│       ├── SystemsPage.tsx
│       ├── SignalsPage.tsx
│       ├── PredictionsPage.tsx
│       └── SentimentPage.tsx
└── tests/
    ├── setup.ts
    └── MonitorPage.test.tsx

## Types & API shapes (copy these into `src/types.ts`)

/* Example TypeScript interfaces for API responses and WebSocket events. Keep these in `src/types.ts` and import where needed. */

export interface SystemStatus {
  timestamp: string; // ISO timestamp
  components: Array<{ id: string; name: string; status: 'ok'|'warn'|'error'; details?: string }>;
  gpus?: Array<{ id: string; name: string; memoryTotal: number; memoryUsed: number; utilization?: number }>;
}

export interface Signal {
  id: string;
  symbol: string;
  time: string; // ISO
  score: number; // -1..1
  meta?: Record<string, any>;
}

export type WebSocketEvent =
  | { type: 'system_status'; payload: SystemStatus }
  | { type: 'signal'; payload: Signal }
  | { type: 'prediction'; payload: { id: string; symbol: string; time: string; values: number[] } }
  | { type: 'sentiment'; payload: { symbol: string; score: number; window: string } };

## API client examples and small contract

- client.ts (fetch wrapper):

  - Responsibility: centralize fetch options, JSON parsing, and error mapping.
  - Inputs: path string, options (method, headers, body), optional typed response generic.
  - Outputs: parsed JSON or throws a typed Error.

- healthClient.ts (example):

  - getStatus(): Promise<SystemStatus>
  - Implementation notes: call `/api/status`, on failure return a fallback from `src/fixtures/system_status.json` when in development (NODE_ENV !== 'production'), and emit console.warn so maintainers can see degraded behavior.

## WebSocket contract and reconnect behavior

- Endpoint: `/api/ws/monitor` (same-origin via nginx proxy to internal monitor service).
- Events: use `WebSocketEvent` union above. Keep messages small. If sending large arrays (predictions), consider chunking or compressing on server.
- Reconnect logic:

  - exponential backoff starting at 500ms, doubling each attempt with jitter, cap at 30s.
  - attempt count should be reset after a successful connection for backoff fairness.
  - expose `isConnected`, `lastMessage`, `send` via the `useWebSocket` hook.

## Example `useWebSocket` hook contract

- Inputs: url (string), options { onEvent?: (ev: WebSocketEvent) => void, autoConnect?: boolean }
- Outputs: { isConnected: boolean; lastEvent?: WebSocketEvent; send: (ev: any) => void; close: () => void }
- Behavior: automatically JSON.parse incoming messages and route to onEvent. Provide a small internal queue for outgoing messages until the socket is open.

## Testing guidance

- Unit tests

  - Use Vitest with jsdom.
  - Keep tests fast. Mock fetch with `vi.fn()` in client tests and assert calls.
  - For hooks that use WebSocket, mock the global WebSocket in test setup or inject a small in-memory fake WebSocket class.

- Integration / E2E

  - Use Playwright for one or two smoke flows: (1) app loads and shows Monitor Page data; (2) when a WS `signal` event is emitted, the UI shows a new signal row.

- Test file conventions

  - Place tests under `src/__tests__/*` or the `tests/` folder at project root. Name them `*.test.tsx`.
  - Add a test for each major page and one for each critical hook (e.g., `useWebSocket`, `useSystemStatus`).

## Accessibility and styling rules

- Semantic HTML: prefer <button>, <nav>, <main>, <header>, <section>, and <table> where appropriate.
- Keyboard support: all interactive controls must be reachable via tab and operate via keyboard shortcuts if they perform important actions (restart, pause/continue streaming).
- Colors: include contrast-check comments near color decisions, and keep a `theme.tsx` for color tokens and spacing.

## Design system & shadcn UI (theme, visuals, responsive rules)

The app should use the shadcn/ui component library as the base design system and follow a refined enterprise theme: primarily black and shades of grey, with muted candid color accents for highlights and status. The overall look should be elegant, minimalistic, and intuitive, with depth/elevation used to organize content. Visualizations (charts, sparklines) should be present wherever applicable. All components must be responsive and rearrange gracefully depending on viewport size.

High-level goals:

- Use shadcn/ui for primitives and adapt its styling via Tailwind tokens and CSS variables.
- Palette: primary neutrals (black -> dark grey -> mid grey -> light grey), accents in muted candid tones (soft teal, warm amber, muted mauve) for status/highlights.
- Typography: clean, modern sans-serif stack; keep weights subtle and use muted colors for text. Fonts should be defined in Tailwind `theme.fontFamily` and referenced by `theme.tsx` tokens.
- Depth: define elevation tokens (z1..z5) using subtle shadows and slightly raised surfaces; prefer layered greys with translucency rather than bright colors.
- Responsiveness: use CSS grid and Flexbox; at small widths collapse multi-column cards into a single column and stack side panels under the main content. At large widths use multi-column grid layouts with left nav, main content, and right sidebar.

Suggested Tailwind / shadcn integration snippets

1) Tailwind config additions (tailwind.config.cjs) — extend theme with palette, fonts, and elevation tokens:

  module.exports = {
    theme: {
      extend: {
        colors: {
          // neutrals
          neutral: {
            900: '#000000',
            800: '#0f0f0f',
            700: '#1f1f1f',
            600: '#2f2f2f',
            500: '#444444',
            400: '#666666',
            300: '#8a8a8a',
            200: '#bfbfbf',
            100: '#e6e6e6'
          },
          // muted accents (use sparingly)
          accent: {
            teal: '#5aa7a7',
            amber: '#caa15a',
            mauve: '#a58fae'
          }
        },
        fontFamily: {
          sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto'],
        },
        boxShadow: {
          'elevation-1': '0 1px 2px rgba(0,0,0,0.35)',
          'elevation-2': '0 4px 8px rgba(0,0,0,0.35)',
          'elevation-3': '0 8px 16px rgba(0,0,0,0.4)'
        }
      }
    }
  }

2) CSS variables + theme helper (`src/theme.tsx`) — small helper to export tokens for components:

  export const theme = {
    colors: {
      bg: 'var(--color-neutral-900)',
      panel: 'var(--color-neutral-800)',
      mutedText: 'var(--color-neutral-400)',
      accent: 'var(--color-accent-teal)'
    },
    elevation: {
      1: 'shadow-elevation-1',
      2: 'shadow-elevation-2',
      3: 'shadow-elevation-3'
    }
  };

3) shadcn UI notes

- Install and use `shadcn/ui` components for base building blocks (buttons, dialogs, inputs, dropdowns). Wrap or extend them with local tokens when necessary.
- Keep component styling minimal; prefer using Tailwind utility classes and the theme helper to apply colors and elevation.
- Example: create `components/ui/Card.tsx` that composes the shadcn `Card` primitive and applies background `bg-neutral-800`, text color `text-neutral-100`, and `shadow-elevation-1`.

Layout & responsiveness rules

- Global layout: three regions when width >= 1200px — left navigation (250px), main content (fluid), right contextual sidebar (300px). Use CSS grid: grid-cols-[250px_1fr_300px].
- Tablet: collapse right sidebar under main content; left nav becomes collapsible (hamburger) and overlays the content.
- Mobile: single column. Navigation becomes a top nav or slide-over drawer. Cards stack vertically. Use `@media` breakpoints or Tailwind's responsive classes to reorganize.
- Cards: prefer consistent max-widths and internal padding. Use subtle separators and elevation to indicate hierarchy.

Visualizations guidance

- Use a small, consistent chart library (e.g., Recharts, Chart.js, or lightweight visx). Keep visuals minimal: muted gridlines, monochrome series with accent color for highlights.
- Charts should be responsive: size to container width and listen to resize events or use a responsive wrapper.
- Sparklines: use tiny, low-contrast lines inside table rows to show short-term trends.
- Prefer area charts with subtle gradients using the accent color multiplied by low alpha for depth.

Interaction & motion

- Use subtle motion for elevation and transitions (fade/slide in for cards and drawers). Keep motion minimal and optional (respect `prefers-reduced-motion`).
- Hover states: reveal controls lightly (icon buttons appear on hover). Keep click targets accessible and clearly visible.

Examples & developer notes

- Example Card (Tailwind + shadcn composition):

  <div className="bg-neutral-800 text-neutral-100 rounded-lg p-4 shadow-elevation-1">
    <h3 className="text-lg font-medium">ONNX Runner</h3>
    <p className="text-neutral-400">Status: OK</p>
  </div>

- Example sparklines: keep line color `text-neutral-200` with an accent fill for area under the curve.

Accessibility & color-contrast

- Verify color contrast ratios for text and UI elements. The neutral palette must maintain AA contrast for body text. Use muted accents for non-essential UI elements where contrast is lower but still readable.

How to adopt this into the codebase

- Add `shadcn/ui` and required peer deps to `frontend/package.json` and run the standard installation flow (`npx shadcn-ui@latest init` if desired).
- Add the Tailwind config snippets above and ensure `src/styles.css` imports Tailwind and sets CSS variables for the neutral palette.
- Replace or wrap existing presentational components with shadcn primitives and the tokens above.

---

I've added this new design system guidance to the instructions. Next I'll validate the file and mark the design update todo completed. If you'd like, I can proceed to generate `src/types.ts`, or add starter `client.ts` and `useWebSocket.ts` implementations wired to these tokens. Which should I do next? 

## Deployment notes and nginx hints

- When building for Docker, ensure the base path of built assets in `index.html` matches how nginx serves them.
  - Two common approaches:
    1) Build the app with root base (default) and serve it at `/` in nginx.
    2) Build the app with a `base = '/ui/'` (Vite option) and configure nginx to serve with `location /ui/ { alias /usr/share/nginx/html/; }` so assets are served correctly.

- WebSocket proxying: ensure nginx's proxy block for `/api/ws/` includes these headers to support upgrades and preserve the client host: 

  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;

- Quick runtime fix: if you discover built `index.html` references `/ui/*` but nginx serves root `/`, either:
  - add the `location /ui/ { alias /usr/share/nginx/html/; }` alias to nginx.conf, or
  - rebuild the frontend with Vite `base: '/'` and redeploy the image.

## Commenting guidance for feature-specific files (page-by-page)

- MonitorPage.tsx
  - Top of file: short description of the page's responsibilities (subscribe to WS, show system snapshot, permit quick restarts).
  - For each major section (SystemCards grid, ControlsPanel): add a 1-2 line comment describing data source and refresh strategy (push vs pull).

- SignalsPage.tsx
  - Document the pagination strategy (cursor vs page), filtering options, and where to place server-side filtering vs client-side filtering.

- PredictionsPage.tsx
  - Explain how forecasts align to chart x-axis timestamps and how to merge historical overlays with predicted series.

- SentimentPage.tsx
  - Note how sentiment scores are normalized and any smoothing window used (e.g., 5-minute rolling average).

## Pages & Features (detailed)

This section defines each SPA page and the feature contracts they must satisfy. Use these as the development checklist for implementing pages, components, tests, and accessibility requirements. Each page entry includes: purpose, core components, data sources (HTTP + WS), visuals & charts, interactions, test cases, accessibility notes, and priority.

1) Monitor Page — `/`

  - Purpose: Real-time system dashboard showing system snapshot, GPU status, ONNX runner health, and live events (signals, predictions, errors).
  - Core components:
    - TopNav (global controls/navigation)
    - SystemCard / SystemGrid (summary tiles)
    - GPUCard (per-GPU stats and quick actions)
    - ONNXRunnerCard (status, model versions, controls: reload/restart)
    - ControlsPanel (global quick actions: pause/resume stream, clear alerts)
    - EventsFeed (chronological WS event list) — optional collapsed panel
  - Data sources:
    - HTTP: `GET /api/status` (SystemStatus)
    - WS: `/api/ws/monitor` (events: system_status, signal, prediction, sentiment)
  - Visuals:
    - Small line sparklines for CPU/GPU usage
    - Cards with subtle elevation and iconography
    - Badge colors: neutral greys + accent for warnings/alerts
  - Interactions:
    - Click to expand a component card to show details and logs (modal or drawer)
    - Restart control calls `POST /api/components/:id/restart` and shows optimistic UI state while awaiting confirmation
    - Toggle stream pause/resume (client-side UI + server API `POST /api/stream/pause`)
  - Tests:
    - Unit: SystemCard renders with given props; clicking restart triggers onRestart prop and shows spinner
    - Integration: mock WS `signal` event and assert EventsFeed shows new item
  - Accessibility:
    - Ensure card controls are reachable by keyboard; provide aria-labels for action buttons
  - Priority: High

2) Systems Page — `/systems`

  - Purpose: Persistent list of system components and long-form diagnostics and logs.
  - Core components:
    - ComponentsTable (sortable, filterable)
    - ComponentDetailsDrawer (logs, metrics, restart history)
  - Data sources:
    - HTTP: `GET /api/components`, `GET /api/components/:id/logs` (paginated)
    - WS: `system_status` updates to refresh top-level status indicators
  - Visuals:
    - Table rows with small sparklines for recent metrics
    - Download/Export buttons for logs
  - Interactions:
    - Pagination and server-side filtering
    - Download logs (link to `/api/components/:id/logs?format=txt`)
  - Tests:
    - Unit: ComponentsTable renders columns and sort/filter controls
    - Integration: open ComponentDetailsDrawer and verify logs load
  - Accessibility:
    - Table must include proper table semantics and row headers
  - Priority: Medium

3) Signals Page — `/signals`

  - Purpose: Explore generated trading signals with filtering, sorting, pagination, and per-signal details.
  - Core components:
    - SignalsTable (columns: time, symbol, score, trend sparkline, actions)
    - SignalDetailsDrawer (market context, related predictions)
    - FiltersBar (symbols, score range, timeframe)
  - Data sources:
    - HTTP: `GET /api/signals?cursor=...&limit=...&filter=...`
    - WS: optionally receive live `signal` events to prepend to table
  - Visuals:
    - Sparklines in table rows, clearly visible score badges using accent color for strong signals
    - A small chart in SignalDetails showing recent price and the time the signal fired
  - Interactions:
    - Cursor-based pagination (prefer cursor tokens to page numbers for large datasets)
    - Multi-select for bulk actions (e.g., mark reviewed)
  - Tests:
    - Unit: render SignalsTable with fixture data
    - Integration: apply filter and assert HTTP client called with correct query params; mock WS signal received and ensure UI updates if live-stream enabled
  - Accessibility:
    - Filters must be accessible and labeled; table rows should include action buttons with aria-labels
  - Priority: High

4) Predictions Page — `/predictions`

  - Purpose: Show model predictions, forecast intervals, and allow comparison to historical price.
  - Core components:
    - ForecastChart (responsive, overlays multiple series)
    - ForecastList (rows of model runs/prediction summaries)
    - ModelPicker (select model and horizon)
  - Data sources:
    - HTTP: `GET /api/predictions?symbol=...&model=...&since=...`
    - WS: `prediction` events to append or annotate chart
  - Visuals:
    - Area chart for prediction with translucent fill, historical price in muted grey, predicted median in accent color
    - Hover tooltips with exact timestamps and values
  - Interactions:
    - Toggle confidence interval visibility
    - Zoom/pan time range (optional)
  - Tests:
    - Unit: ForecastChart renders series and responds to window resize
    - Integration: mock prediction events and assert chart annotation updates
  - Accessibility:
    - Tooltips should be keyboard-accessible; provide text summaries for charts for screen readers
  - Priority: Medium-High

5) Sentiment Page — `/sentiment`

  - Purpose: Aggregate symbol sentiment from FinBERT and display time-series and distributions.
  - Core components:
    - SymbolSentimentCard (score, recent change)
    - SentimentTimeline (time-series chart)
    - TopSymbolsList (ranked by sentiment)
  - Data sources:
    - HTTP: `GET /api/sentiment?symbol=...&window=...`
    - WS: `sentiment` events to update rolling aggregates
  - Visuals:
    - Bar/area charts with muted colors; highlight significant shifts with accent color
  - Interactions:
    - Select symbol to see time series and underlying article snippets (if available)
  - Tests:
    - Unit: SymbolSentimentCard snapshot tests
    - Integration: update rolling window and assert timeline responds
  - Accessibility:
    - Provide alt text or a textual summary for charts
  - Priority: Medium

6) Executions Page — `/executions`

  - Purpose: View and submit order executions, show execution logs and statuses.
  - Core components:
    - OrderForm (select symbol, qty, price, side)
    - ExecutionList (recent orders, status badges)
    - ExecutionDetailDrawer (order lifecycle, logs)
  - Data sources:
    - HTTP: `POST /api/executions` (submit), `GET /api/executions?limit=...`
    - WS: not required but can stream execution updates
  - Visuals:
    - Status badges (muted until filled, then highlight with accent)
  - Interactions:
    - Confirm modal for market orders
    - Client-side validation and server-side error handling with sanitized messages
  - Tests:
    - Unit: OrderForm validation tests
    - Integration: submit mock order and assert execution list updates
  - Accessibility:
    - Form inputs labeled and error messages announced
  - Priority: Medium

7) Training Page — `/training`

  - Purpose: Control light-weight training orchestration tasks (trigger training, show logs/state).
  - Core components:
    - TrainingControls (start/stop, hyperparams)
    - TrainingLogPanel (streaming logs)
  - Data sources:
    - HTTP: `POST /api/training/start`, `GET /api/training/:id/logs`
    - WS: streaming logs/events for a running job
  - Visuals:
    - Log panel with auto-scroll and pause capability
  - Interactions:
    - Start/stop commands with confirmation; display job state
  - Tests:
    - Unit: TrainingControls renders and validates inputs
    - Integration: stream mock logs and verify TrainingLogPanel displays entries
  - Accessibility:
    - Ensure logs can be navigated with keyboard and readable by screen readers
  - Priority: Low-Medium

8) Metrics & DB — `/metrics`, `/db`

  - Purpose: Provide links and small embeds for observability (Prometheus/Grafana) and a DB explorer view.
  - Core components:
    - LinksPanel (external links to Grafana dashboards)
    - DBExplorer (simple table viewer for query results — read-only)
  - Data sources:
    - HTTP: proxied dashboards or read-only DB query endpoints
  - Visuals:
    - Embedded Grafana panels (iframe) or links that open in a new tab
  - Tests:
    - Unit: DBExplorer renders sample data
  - Accessibility:
    - Provide accessible labels for iframes and links
  - Priority: Low

9) Settings Page — `/settings`

  - Purpose: Centralized UI for configuring and controlling application components and feature flags. The Settings page is the authoritative place for per-component configuration (restart behavior, thresholds, model toggles), global feature flags (enable/disable streaming, debug logging), and user preferences (theme, reduced motion). Settings must be auditable and safe: changes should be permission-checked, support optimistic UI updates, and record user/action metadata.
  - Core components:
    - SettingsSections (accordion or tabbed groups for Components, Features, Models, Users/Access)
    - ComponentSettingsRow (per-component toggle + settings modal)
    - FeatureFlagsTable (list of flags, descriptions, toggle switches)
    - ModelControlPanel (enable/disable models, set default model per component)
    - ChangeLog / AuditTrail (view recent changes with user/time)
    - Export/Import (download JSON of current settings; upload to apply)
  - Data sources / API contracts:
    - HTTP: `GET /api/settings` — returns current settings and metadata
      - Response shape: { settings: Record<string, any>, updatedAt: string, updatedBy?: string }
    - HTTP: `PUT /api/settings` — accept partial update body with { keyPath: string, value: any, reason?: string }
      - Response: updated settings snapshot and audit id
    - HTTP: `POST /api/settings/import` — upload JSON to apply (requires elevated permission)
    - HTTP: `GET /api/settings/audit?limit=...` — returns change log entries
    - Optional WS: server may emit `settings_update` events via `/api/ws/monitor` to notify clients of external changes
  - Controls & behaviors:
    - Per-component toggles: enable/disable, restart-on-failure, max-restarts, health-check frequency
    - Thresholds: numeric inputs with validation and a clear explanation of units
    - Model controls: set active model version, rollout % (for canary), and auto-revert on failure
    - Feature flags: boolean toggles with description and link to doc explaining impact
    - Export/Import: export current settings to JSON; import prompts user to confirm and requires elevated permission
    - Audit: every change must be recorded with who/what/why and timestamp; show recent changes in the UI
  - Optimistic updates and conflict handling:
    - When a user toggles a flag, update UI immediately and send `PUT /api/settings`.
    - If server returns conflict (409) or validation error (422), roll back optimistic UI and surface a clear error explaining why, with options to retry or open a diff modal.
  - Permissions & security:
    - Settings changes should be gated by user roles (e.g., admin/operator). UI should hide or disable controls for unauthorized users.
    - Log all changes for audit. Avoid exposing sensitive secrets in exported JSON (mask or exclude secrets).
  - Tests:
    - Unit: ComponentSettingsRow renders controls and validation errors.
    - Integration: optimistic toggle flow: toggle -> mock 200 OK -> success toast; mock 409 -> rollback and show conflict modal.
    - E2E: import/export flow and audit trail verification (admin user).
  - Accessibility:
    - Ensure form inputs have labels and descriptions for screen readers.
    - Audit Trail should be readable and navigable via keyboard.
  - Priority: High (controls critical app behavior)

Cross-cutting features

- Global search (top nav) — search symbols, signals, and models.
- Notifications/toasts — global component for transient messages (errors, confirmations).
- User settings — theme toggle (light/dark) and reduced motion.
- Internationalization (future) — design to allow label overrides.

Development notes

- Each page should begin with a small comment block listing the data contract and acceptance criteria (e.g., "Monitor Page: show system snapshot within 2s of load; handle WS reconnect gracefully").
- Prioritize pages in the order marked by Priority above; implement Monitor and Signals first to enable real-time validation.

## Example comments and TODO markers

- TODO: markers are fine, but prefer the format `// TODO(owner): message` to indicate ownership and intent — e.g., `// TODO(ui): add infinite scroll for signals table`.
- FIXME: use sparingly when code is a known temporary workaround.

## Security and privacy notes

- Avoid logging secrets to the browser console. If backend responds with error details, sanitize before showing to users.
- Rate-limit client retries to avoid DOSing internal services; prefer exponential backoff with capped attempts.

## CI / Workflow suggestions

- Add a `.github/workflows/frontend-ci.yml` pipeline with steps:
  - checkout
  - cache node modules
  - npm ci
  - npm test --if-present
  - build (optional, for release jobs)

## Roadmap / TODOs (expanded)

- Implement Signals, Predictions, Sentiment pages and corresponding API clients (priority: Signals -> Predictions -> Sentiment).
- Add E2E tests (Playwright) to validate WebSocket-driven UI flows.
- Add CI job in `.github/workflows` to run `npm ci && npm test` for the frontend on PRs.
- Consider running Lighthouse against the built `dist/` as a periodic check in CI.

