# temps — live cluster temperature dashboard

Date: 2026-11-02
Repo: `pipitonelabs/apps` (new, public monorepo for small custom homelab apps), app folder `temps/` · Deployed from `pipitonelabs/k8s-gitops`

## Intent

Joe spent Nov 2 reworking cooling on the four cluster nodes (MS-01 blower removal + repaste on m0/m1/m2; heatsinks, top removal and a 120mm fan on w2). During that work, temperatures were read by hand from Prometheus and plotted in a one-off Claude artifact. He wants that permanently, in-cluster, at `temps.pipitonelabs.com`: live numbers for every node plus the timeline charts, refreshing on their own the way a Grafana panel does.

## What the page shows (user's words: "numerical values like they're displayed right now - cpu, nvme, memory for each node")

1. **Live readout (top).** One card per node: m0, m1, m2, w2. Each card shows four big numerals in °C:
   - CPU package
   - NVMe 0
   - NVMe 1
   - Memory (the hotter of the two DIMMs)
   w2 has DDR4 with no DIMM sensor, so its memory slot reads "no sensor", not 0 or blank. A node with no fresh samples (e.g. powered off, like w2 is right now for a heatsink redo) shows an "offline" state instead of stale numbers.
2. **Timeline charts (below).** Four chart cards: CPU, NVMe 0, NVMe 1, Memory. Each has one line per node. **The user explicitly wants these wide**: each chart card spans the full content width (one per row), not a 2×2 grid of small squares.
3. **Time-range picker** for the charts: 1h / 6h / 24h / 7d / 14d. Prometheus retention is 14d, so nothing longer. Default: 24h. *(My call.)*
4. **Cooling-change markers.** Dashed vertical lines with a short label at the Nov 2 change times, shown when they fall inside the selected range (from the artifact: 18:53 UTC m1 blower out + repaste, 19:15 w2 heatsinks/top fan out, 21:06 w2 top off, ~21:20 m0 blower out + repaste, ~21:50 m2 blower out + repaste). Kept as a static list in the source. *(My call.)*

## Look

Dark, futuristic, "Tron / Tesla / SpaceX / xAI": near-black background, thin luminous accent lines, cyan primary glow, monospaced tabular numerals for readings, restrained motion (numbers tween on change, a subtle pulse on the live indicator). Single dark theme. Elegant, not busy: no gradients-everywhere, no gauges-for-the-sake-of-gauges.

Temperature state colors each reading (my call on thresholds, °C):

| Sensor | Normal | Warm | Hot |
|---|---|---|---|
| CPU | < 70 | 70–85 | ≥ 85 |
| NVMe | < 50 | 50–65 | ≥ 65 |
| Memory | < 50 | 50–70 | ≥ 70 |

## Stack (user's requirements)

- shadcn/ui components throughout (Card, Tabs/ToggleGroup for range, Badge, Tooltip, Chart — shadcn's Chart is Recharts-based), Tailwind CSS v4, Vite + React + TypeScript. Same toolchain as `pipitonelabs/resume`.
- Data comes from the cluster's Prometheus, the way Grafana does it: the browser issues PromQL `query` / `query_range` calls, auto-refreshing.

## Data

Prometheus: `http://kube-prometheus-stack-prometheus.observability.svc.cluster.local:9090`. Metric `node_hwmon_temp_celsius`, instance `<ip>:9100`; node name via `node_uname_info{nodename}` (m0=192.168.10.10, m1=.11, m2=.12, w2=.15).

| Reading | Selector |
|---|---|
| CPU (Intel, m0–m2) | `chip="platform_coretemp_0", sensor="temp1"` |
| CPU (AMD, w2) | `chip="pci0000:00_0000:00:18_3", sensor="temp1"` |
| NVMe 0 / 1 | `chip="nvme_nvme0"` / `"nvme_nvme1"`, `sensor="temp1"` |
| Memory | `max by (instance) (chip=~"i2c_0_0_005.")` — m0–m2 only |

These labels were confirmed live against Prometheus on 2026-11-02 after all hardware changes (w2's AMD selector is from earlier the same day; w2 was powered off at confirmation time).

Live values refresh every 10s *(my call)*; charts refresh every 30s with a step that keeps ~300–500 points per series.

**Missing data (my call):**
- *Node offline:* `up{instance="<ip>:9100"}` is 0 or absent → the whole card shows "offline" with the time of the last sample. Instant queries already drop series older than Prometheus's 5m lookback, so stale numbers never show.
- *Single sensor missing on an online node:* that slot shows "—" with a "no data" tooltip. w2 memory is special-cased as "no sensor" because it has none.
- *Charts:* gaps are drawn as breaks in the line, not interpolated.

**Markers:** stored in UTC in a single `events.ts` list, displayed in America/New_York. Adding one later means a repo edit and redeploy, which is acceptable. The two "~" times stay approximate.

## Architecture (my call)

One container: nginx (unprivileged) serving the built SPA, plus a reverse proxy at `/api/v1/query` and `/api/v1/query_range` → Prometheus. Only those two GET paths are proxied; everything else under `/api/` returns 404. No custom backend code. Browser never needs Prometheus's address.

## Delivery

- **Repo** `pipitonelabs/apps`, public, so no image pull secret is needed. Joe chose a monorepo: each app lives in its own top-level folder (`temps/` first) with its own workflow, `.github/workflows/temps.yaml`. The workflow is path-filtered to `temps/**` and runs on push to `main`. It builds and pushes `ghcr.io/pipitonelabs/temps:{latest,<sha>}`, following the same pattern as `resume/.github/workflows/build.yml`.
- **Sensitivity:** the repo holds no secrets. It does contain node names, LAN IPs, and the internal Prometheus service DNS name, but `pipitonelabs/k8s-gitops` is already public with the same information.
- **GitOps** in k8s-gitops on a feature branch, opened as a PR, not merged without Joe's say-so:
  `kubernetes/apps/observability/temps/{ks.yaml, app/{kustomization.yaml, helmrelease.yaml}}`, wired into `kubernetes/apps/observability/kustomization.yaml`. app-template HelmRelease, 1 replica, non-root, image pinned by digest, HTTPRoute `temps.pipitonelabs.com` on **`envoy-internal`** (internal only, user's decision), Gatus endpoint annotation. No auth (internal, matches other LAN-only apps). `dependsOn` kube-prometheus-stack.
- **Order (my call):** create the repo and push, wait for the first CI build, then open the GitOps PR pinned to that digest. After that, Renovate tracks the digest the same way it does for `tradeforge-selfhost-web`.
- **Gatus (my call):** use the same annotation shape as `blog`, but the check hits `/api/v1/query?query=up`, so a broken Prometheus proxy turns the endpoint red.
- **Network (my call):** observability has no CiliumNetworkPolicy today, so no policy is needed. The builder verifies this with a test query from the pod.

## Non-goals

- No alerting (Alertmanager already exists).
- No editing/annotation from the UI; markers are static.
- No other metrics (load, fans, power) — temps only.
- No public exposure.

## Anti-goals

- Looks like a stock Grafana clone or a generic admin template.
- Small cramped chart squares (user specifically asked for wider cards).
- Showing stale numbers for an offline node as if they were live.

## Left to the builder

Component breakdown, exact palette tokens and fonts, animation details, chart step math, nginx config specifics, Dockerfile shape.
