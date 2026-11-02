# temps dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Live, futuristic temperature dashboard for m0/m1/m2/w2 at `temps.pipitonelabs.com` (internal), built in the new public `pipitonelabs/apps` monorepo and deployed via k8s-gitops.

**Architecture:** Vite + React SPA in `apps/temps/`, served by unprivileged nginx which also reverse-proxies only `GET /api/v1/query` and `/api/v1/query_range` to in-cluster Prometheus. Pure TS modules (queries, parsing, thresholds, series) are unit-tested with Vitest; UI is shadcn/ui on Tailwind v4 with shadcn Chart (Recharts). GitHub Actions builds `ghcr.io/pipitonelabs/temps`; app-template HelmRelease on `envoy-internal`.

**Tech Stack:** Vite 5, React 18, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui (card, badge, toggle-group, tooltip, chart), Recharts, Vitest, nginx-unprivileged, GitHub Actions, Flux + app-template.

**Spec:** `docs/superpowers/specs/2026-11-02-temps-dashboard-design.md`

## Global Constraints

- Nodes: m0 `192.168.10.10`, m1 `.11`, m2 `.12`, w2 `.15` (port 9100). w2 has no memory sensor.
- CPU `chip="platform_coretemp_0",sensor="temp1"` (m0–m2); `chip="pci0000:00_0000:00:18_3",sensor="temp1"` (w2). NVMe `chip="nvme_nvme0"|"nvme_nvme1",sensor="temp1"`. Memory `max by (instance)` of `chip=~"i2c_0_0_005."`.
- Thresholds °C — CPU warm 70 hot 85; NVMe warm 50 hot 65; Memory warm 50 hot 70.
- Live refresh 10s; charts refresh 30s; ranges 1h/6h/24h/7d/14d, default 24h; ~300–500 points/series.
- Chart cards are full content width, one per row (user asked for wider cards).
- Single dark theme; Tron/SpaceX/xAI look; tabular monospaced numerals.
- Events stored UTC in `events.ts`, displayed America/New_York.
- Prometheus: `http://kube-prometheus-stack-prometheus.observability.svc.cluster.local:9090`.
- k8s-gitops: feature branch + PR, never merge without Joe saying so; no `Co-Authored-By` trailers; no buroa/onedr0p mentions.

## Review Focus

- A node powered off (w2 right now) → card "offline" + last-seen time, no stale numbers; its chart line breaks (Task 2, Task 4 tests).
- One sensor missing on an online node → "—" not 0 (Task 2 test).
- Prometheus unreachable / proxy 5xx → keep last good values, show a non-blocking "data stale" badge, retry on next tick (Task 2 test for `fetchLive` rejection handling in `useLive`, Task 5).
- 14d range → step large enough to stay ≤ 500 points (Task 4 test).
- Phone width (~400px) → node cards stack, charts stay readable without horizontal page scroll (Task 6 manual check).

---

### Task 1: Scaffold monorepo + temps app

**Files:**
- Create: `apps/.gitignore`, `apps/temps/{package.json,vite.config.ts,tsconfig.json,index.html,components.json,src/main.tsx,src/App.tsx,src/index.css}`

- [ ] **Step 1:** `git init` in `~/workspaces/apps` (branch `main`), add `.gitignore` (`node_modules`, `dist`).
- [ ] **Step 2:** Create the Vite React-TS app in `temps/`, add Tailwind v4 via `@tailwindcss/vite`, `@/` alias, run `npx shadcn@latest init` then `add card badge toggle-group tooltip chart`. Add `vitest` + `"test": "vitest run"`.
- [ ] **Step 3:** Vite dev proxy: `/api` → `http://localhost:9090` (used with `kubectl port-forward svc/kube-prometheus-stack-prometheus -n observability 9090`).
- [ ] **Step 4:** Verify `npm run build` and `npm test` (no tests yet → passes with `--passWithNoTests`).
- [ ] **Step 5:** Commit `chore: scaffold temps app` (with the spec + plan docs).

### Task 2: Prometheus queries + live model

**Files:**
- Create: `temps/src/lib/nodes.ts`, `temps/src/lib/prom.ts`, `temps/src/lib/live.ts`
- Test: `temps/src/lib/live.test.ts`

**Interfaces:**
- Produces:
  - `type NodeName = 'm0'|'m1'|'m2'|'w2'`; `type Metric = 'cpu'|'nvme0'|'nvme1'|'mem'`
  - `NODES: {name: NodeName; ip: string; hasMemSensor: boolean}[]`; `nodeByInstance(instance: string): NodeName | undefined`
  - `QUERIES: Record<Metric, string>` and `UP_QUERY = 'up{instance=~"192\\.168\\.10\\.1[0-5]:9100"}'`
  - `promQuery(q: string): Promise<PromVector>`; `promRange(q: string, start: number, end: number, step: number): Promise<PromMatrix>` (fetch `/api/v1/...`, throw on non-`success`)
  - `type Reading = number | null | 'no-sensor'`; `interface NodeLive { node: NodeName; online: boolean; values: Record<Metric, Reading> }`
  - `buildLive(up: PromVector, byMetric: Record<Metric, PromVector>): NodeLive[]` (pure); `fetchLive(): Promise<NodeLive[]>`

- [ ] **Step 1: Failing tests** in `live.test.ts`, using hand-written vector fixtures:
  - all four up with full data → m0 `cpu` 37, `mem` 35.75; order is m0,m1,m2,w2.
  - w2 absent from `up` (or `up`=0) → `online:false`, every value `null`.
  - m1 up but missing from `nvme1` vector → m1 `nvme1` `null`, `online:true`.
  - w2 online → `mem === 'no-sensor'` even though absent.
- [ ] **Step 2:** `npm test` → FAIL (module missing).
- [ ] **Step 3:** Implement `nodes.ts`, `prom.ts`, `live.ts` with the constraint selectors.
- [ ] **Step 4:** `npm test` → PASS. Then against port-forwarded Prometheus, run `npx tsx -e` calling `fetchLive()` through `http://localhost:9090` (pass base URL via `PROM_BASE`, default `''`) and confirm m0–m2 values match `kubectl get --raw .../proxy/api/v1/query` output.
- [ ] **Step 5:** Commit `feat(temps): prometheus queries and live model`.

### Task 3: Threshold states

**Files:** Create `temps/src/lib/thresholds.ts`; Test `temps/src/lib/thresholds.test.ts`

**Interfaces:** Produces `type TempState = 'normal'|'warm'|'hot'|'none'`; `tempState(metric: Metric, v: Reading): TempState`.

- [ ] **Step 1: Failing tests:** `tempState('cpu',69.9)='normal'`, `('cpu',70)='warm'`, `('cpu',85)='hot'`, `('nvme0',50)='warm'`, `('nvme1',65)='hot'`, `('mem',49)='normal'`, `('mem',70)='hot'`, `('cpu',null)='none'`, `('mem','no-sensor')='none'`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(temps): temperature thresholds`.

### Task 4: Ranges, step math, chart series, events

**Files:** Create `temps/src/lib/series.ts`, `temps/src/lib/events.ts`; Test `temps/src/lib/series.test.ts`

**Interfaces:**
- Produces:
  - `type RangeKey = '1h'|'6h'|'24h'|'7d'|'14d'`; `RANGES: Record<RangeKey, number /*seconds*/>`; `DEFAULT_RANGE: RangeKey = '24h'`
  - `stepFor(rangeSeconds: number): number` → `max(15, ceil(range/400))`
  - `toChartRows(m: PromMatrix, start: number, end: number, step: number): ChartRow[]` where `ChartRow = { t: number /*ms*/ } & Partial<Record<NodeName, number|null>>`, one row per step, missing samples = `null` (line gap)
  - `lastSeen(m: PromMatrix, node: NodeName): number | null` (ms of last sample)
  - `EVENTS: {t: string /*ISO UTC*/; label: string}[]` (the five Nov 2 changes from the spec); `eventsIn(start: number, end: number)`
  - `fetchSeries(metric: Metric, range: RangeKey): Promise<{rows: ChartRow[]; lastSeen: Partial<Record<NodeName, number|null>>}>`

- [ ] **Step 1: Failing tests:** `stepFor(3600)=15`; `stepFor(14*86400)=3024` and `14*86400/3024 <= 400`; `toChartRows` with w2 samples stopping midway → later rows have `w2: null`, earlier rows numeric; `lastSeen` returns that last timestamp; `eventsIn` for Nov 2 18:00–22:00 UTC returns all 5, for Nov 1 returns 0.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(temps): range series and cooling events`.

### Task 5: Live readout UI

**Files:** Create `temps/src/hooks/usePoll.ts`, `temps/src/components/NodeCard.tsx`, `temps/src/components/LiveGrid.tsx`; Modify `temps/src/App.tsx`, `temps/src/index.css` (dark tokens, glow utilities, mono numerals font e.g. JetBrains Mono / Orbitron for headings via `@fontsource`).

**Interfaces:**
- Consumes `fetchLive`, `tempState`, `lastSeen` (from Task 4, via the CPU series fetched by the charts).
- Produces `usePoll<T>(fn: () => Promise<T>, ms: number): { data: T | undefined; error: unknown; stale: boolean; updatedAt: number | null }` — keeps the last good `data` on rejection and sets `stale`.

- [ ] **Step 1:** Implement `usePoll` + test in `usePoll.test.ts` with fake timers: first resolve sets data; next rejection keeps data and sets `stale: true`; next success clears `stale`.
- [ ] **Step 2:** Run → PASS.
- [ ] **Step 3:** `NodeCard` (shadcn Card): node name, online dot pulse, four readings with label, °C, state color (`normal` cyan, `warm` amber, `hot` red), numbers tween on change; offline → "OFFLINE · last seen HH:MM" ET; `'no-sensor'` → "no sensor"; `null` → "—" with Tooltip "no data". `LiveGrid`: 4 columns ≥1280px, 2 at md, 1 on phone. Header with live indicator, last updated time, "stale" Badge.
- [ ] **Step 4:** `npm run dev` with port-forward; screenshot in Chrome; confirm m0–m2 match Prometheus and w2 state is correct.
- [ ] **Step 5:** Commit `feat(temps): live readout`.

### Task 6: Timeline charts

**Files:** Create `temps/src/components/TempChart.tsx`, `temps/src/components/RangePicker.tsx`, `temps/src/components/Timelines.tsx`; Modify `temps/src/App.tsx`.

- [ ] **Step 1:** `RangePicker` (shadcn ToggleGroup) over `RANGES`. `TempChart` (shadcn ChartContainer + Recharts LineChart): full width, height ~280px, one colored line per node with `connectNulls={false}`, ET time axis, threshold reference line at the metric's warm value, dashed `ReferenceLine`s from `eventsIn` with short labels, shared ChartTooltip. `Timelines`: four stacked cards (CPU, NVMe 0, NVMe 1, Memory), refresh every 30s via `usePoll`.
- [ ] **Step 2:** Visual check at 1440px and 400px in Chrome: cards span full width, no horizontal page scroll, 24h shows w2 gap from today's shutdown, markers visible on 24h.
- [ ] **Step 3:** `npm run build && npm test` → both pass.
- [ ] **Step 4:** Commit `feat(temps): timeline charts`.

### Task 7: Container + CI

**Files:** Create `temps/Dockerfile`, `temps/nginx.conf`, `.github/workflows/temps.yaml`

- [ ] **Step 1:** `nginx.conf`: listen 8080; SPA fallback; `location = /api/v1/query` and `= /api/v1/query_range` → `proxy_pass $PROM_URL` (envsubst template, default the in-cluster URL), `limit_except GET { deny all; }`; `location /api/ { return 404; }`; `location = /healthz { return 200; }`.
- [ ] **Step 2:** `Dockerfile`: `node:22-alpine` build → `nginxinc/nginx-unprivileged:1.27-alpine`, copy `dist` and template to `/etc/nginx/templates/default.conf.template`.
- [ ] **Step 3:** Local check: `docker build -t temps:dev temps && docker run -p 8080:8080 -e PROM_URL=http://host.docker.internal:9090 temps:dev`; `curl -s localhost:8080/api/v1/query?query=up | jq .status` → `"success"`; `curl -o /dev/null -w '%{http_code}' localhost:8080/api/v1/labels` → `404`; `curl -X POST ... /api/v1/query` → `403`.
- [ ] **Step 4:** Workflow modeled on `resume/.github/workflows/build.yml`: `on.push.branches: [main]`, `paths: ['temps/**', '.github/workflows/temps.yaml']`, `workflow_dispatch`; context `temps`, image `ghcr.io/pipitonelabs/temps`, tags `latest` + `${{ github.sha }}`.
- [ ] **Step 5:** Commit `ci(temps): container image build`.
- [ ] **Step 6:** `gh repo create pipitonelabs/apps --public --source . --push`; watch `gh run watch`; confirm success; make the `temps` GHCR package public if it isn't (`gh api` / package settings) and verify `docker pull ghcr.io/pipitonelabs/temps:latest` anonymously. Record the digest.

### Task 8: k8s-gitops deployment PR

**Files (k8s-gitops):**
- Create: `kubernetes/apps/observability/temps/ks.yaml`, `kubernetes/apps/observability/temps/app/{kustomization.yaml,helmrelease.yaml}`
- Modify: `kubernetes/apps/observability/kustomization.yaml` (add `./temps/ks.yaml`)

- [ ] **Step 1:** `git checkout main && git pull && git checkout -b feature/temps-dashboard`.
- [ ] **Step 2:** `ks.yaml` modeled on `default/blog/ks.yaml`, namespace `observability`, `dependsOn: kube-prometheus-stack` (namespace observability). HelmRelease modeled on `blog`: 1 replica, non-root 101, image `ghcr.io/pipitonelabs/temps`, tag `latest@sha256:<digest>`, port 8080, probes on `/healthz`, requests 10m/32Mi limit 128Mi, route hostnames `temps.pipitonelabs.com`, parentRef `envoy-internal` (networking), Gatus annotation with `url` path `/api/v1/query?query=up` and condition `[STATUS] == 200`.
- [ ] **Step 3:** `flux-local test` (or `kustomize build kubernetes/apps/observability/temps/app`) passes. Confirm renovate tracks the digest the same way `tradeforge-selfhost-web` is tracked (no config change if the existing ghcr digest rule covers it; otherwise note in PR).
- [ ] **Step 4:** Commit `feat(temps): deploy temps dashboard`, push, open PR with the mattpocock `pr` template. Do not merge.
- [ ] **Step 5 (after Joe merges):** verify HelmRelease Ready, `curl https://temps.pipitonelabs.com/api/v1/query?query=up` from LAN, open in Chrome.
