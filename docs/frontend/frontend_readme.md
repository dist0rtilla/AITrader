# AITrader Frontend (SPA)

This document describes the single-page application (SPA) frontend for AITrader, its features, directory layout, development workflow, and how it integrates with the backend services.

Instruction source: `.github/instructions/copilot-instructions.instructions.md`

## Purpose

The SPA is a lightweight control panel for monitoring system components, visualizing model predictions, reviewing sentiment, launching training, and inspecting the database and execution flows. It's built with React + Vite + TypeScript and uses Tailwind for styling.

## 🚀 **Fast Development Options**

### **Super Fast Local Development** (Recommended)
Requirements: Node 18+, npm

```bash
# From project root
./hostexecs/dev-quick.sh
# Available at: http://localhost:5173
# ✅ 0 seconds build time, instant hot reload
```

### **Docker Development with Hot Reload**
Requirements: Docker, Docker Compose

```bash
# From project root  
./hostexecs/dev-docker.sh
# Available at: http://localhost:8080
# ✅ ~30s one-time build, instant file changes
```

### **Manual Local Development**
Requirements: Node 18+, npm, Docker (for proxy/backends)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run dev server:
   ```bash
   npm run dev
   ```

3. Open the app at `http://localhost:5173` (dev) or `http://localhost:8080` when using Docker/nginx via `docker-compose -f docker-compose.dev-fullstack.yml up -d settings settings-api`.

## Build for production

1. Build the SPA:

   npm run build

2. The `dist/` output will be copied by the `frontend/Dockerfile` into the nginx image used by `settings` in `docker-compose.dev-fullstack.yml`.

## Test

Run unit/smoke tests:

  npm test

## Recent Improvements (September 2025)

### ✅ **Fixed: Trading Signals Display**
- **Issue**: Trading signals were being cut off and using unnecessary scrollbars
- **Solution**: Redesigned with compact layout showing 4 signals maximum with "View All" button
- **Design**: Removed scrollbars entirely - signals now fit perfectly in container
- **Layout**: Compact signal rows with inline time display and mini chart indicators
- **UX**: Added "View All X Signals →" button when more than 4 signals available

### ✅ **Complete Dark Glass UI System**
- **Theme Switching**: Full dark/light mode with persistent storage and system preference detection
- **Glass Morphism**: Professional backdrop blur effects with semi-transparent surfaces
- **CSS Variables**: Dynamic theme switching using CSS custom properties
- **Components**: All components redesigned with glass effects and smooth animations
- **Navigation**: Theme switcher integrated into TopNav with glass styling

### ✅ **Enhanced Responsiveness**
- **Grid Layout**: Improved responsive grid system for monitor dashboard
- **Container Management**: Better height constraints and scrolling for content overflow
- **Glass Containers**: Consistent glass morphism across all major components

### 🛡️ **CRITICAL: Container Design Guardrails**

#### **ALWAYS ENFORCE - Container Layout Rules**
To prevent content clipping, scrolling issues, and layout breaks:

1. **Parent Container Pattern**:
   ```tsx
   <div className="glass-container rounded-glass p-8 flex flex-col">
     <ComponentWithContent className="flex-1 min-h-0 max-h-96" />
   </div>
   ```

2. **Scrollable Component Pattern**:
   ```tsx
   export function ScrollableComponent({ className }) {
     return (
       <div className={`flex flex-col overflow-hidden ${className}`}>
         {/* Fixed header */}
         <div className="flex-shrink-0 p-4 border-b">Header</div>
         
         {/* Scrollable content */}
         <div className="flex-1 overflow-y-auto min-h-0">
           <div className="space-y-2 p-4">Content...</div>
         </div>
         
         {/* Fixed footer */}
         <div className="flex-shrink-0 p-4 border-t">Footer</div>
       </div>
     );
   }
   ```

#### **Required Classes for Container Safety**:
- **Layout containers**: `glass-container rounded-glass p-8 flex flex-col`
- **Card components**: `glass-card rounded-glass-card border border-glass-bright/20 flex flex-col overflow-hidden`
- **Flexible children**: `flex-1 min-h-0` (allows shrinking below content size)
- **Scrollable areas**: `overflow-y-auto min-h-0` (enables scrolling when needed)
- **Height constraints**: `max-h-*` instead of fixed `h-*` when content varies

#### **Common Anti-Patterns to AVOID**:
- ❌ `<div className="h-96"><ScrollableContent /></div>` (clipping)
- ❌ Fixed heights without overflow handling
- ❌ Missing `min-h-0` on flex children
- ❌ Scrollable content outside proper container
- ❌ Multiple components with same ID or duplicate sections

## Features (top-level)

- **Monitor (home)** — Real-time system and component status, GPU metrics, ONNX Runner status, inference latency with glass morphism UI
- **Signals** — Scrollable table of signals with sparklines, ranking, filters, symbol drilldown (fixed overflow issue)
- **Predictions** — ✅ **ENHANCED**: ML model forecasts with N-BEATS, LSTM, and Transformer models, confidence intervals, filtering by model type and confidence score
- **Sentiment** — ✅ **ENHANCED**: FinBERT-powered sentiment analysis with source tracking, authenticity scoring, time window filtering, and market overview dashboard
- **Executions** — Order entry UI and execution history
- **Training** — Training control panel for ML runs (N-BEATS, etc.)
- **Metrics / DB** — Prometheus metrics links and database exploration tools

### ✅ **New: Enhanced Predictions Features**
- **Multi-Model Support**: N-BEATS, LSTM, and Transformer model predictions
- **Confidence Scoring**: Visual confidence indicators with color-coded reliability
- **Forecast Visualization**: Mini charts showing 5-period price forecasts
- **Smart Filtering**: Filter by model type, minimum confidence threshold
- **Real-time Updates**: Auto-refresh with live prediction data
- **Glass Morphism UI**: Consistent with overall design system

### ✅ **New: Enhanced Sentiment Features**
- **FinBERT Integration**: Finance-tuned BERT model for accurate sentiment analysis
- **Source Tracking**: Attribution to trusted news sources (Reuters, Bloomberg, WSJ, etc.)
- **Market Overview**: Aggregated bullish/bearish/neutral sentiment distribution
- **Time Window Filtering**: 1h, 4h, 1d, 1w sentiment analysis windows
- **Authenticity Scoring**: Source reliability and content authenticity metrics
- **Visual Sentiment Scale**: Interactive sentiment score visualization (-1.0 to +1.0)

## Integration points

- Backend API base: `/api/` (proxied to `settings-api` in dev compose)
- WebSocket monitor: `/api/ws/monitor` (server pushes component updates)

## Development notes

- **Tailwind Processing**: Tailwind is processed during `npm run build` / `vite dev`. The `src/styles.css` contains Tailwind directives and CSS variables for theme system
- **Theme System**: Uses React Context (`src/contexts/ThemeContext.tsx`) with CSS variables for dynamic dark/light mode switching
- **Glass UI**: Complete glass morphism design system with backdrop blur, CSS variables, and custom Tailwind classes
- **Scrolling**: Custom scrollbar styling for glass theme consistency (`.custom-scrollbar` class)
- **Nginx Serving**: If serving `dist/` via nginx, ensure asset paths match (the built index may reference `/ui/*` depending on the build base). See `frontend/nginx.conf`

## Where to add features

- Add API clients to `src/api/` (e.g., `predictionsClient.ts`, `sentimentClient.ts`).
- Add hooks to `src/hooks/` (e.g., `useSignals.ts`, `usePredictions.ts`, `useSentiment.ts`).
- Add pages to `src/pages/` (e.g., `MonitorPage.tsx`, `SignalsPage.tsx`, `PredictionsPage.tsx`).
- Add components under `src/components/` grouped by feature.

## Contributing

Follow the repository `.github` guidelines; add tests for any new UI features and keep PRs small. Avoid committing large build artifacts or node_modules.
Frontend SPA placeholder. Use React + Vite. Pages: Home (monitor), Execution, Database, Settings, Strategies.
WebSocket connect to backend `/api/ws/monitor` for realtime status.