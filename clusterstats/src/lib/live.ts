import { LAST_SEEN_QUERY, METRICS, NODES, QUERIES, UP_QUERY, nodeByInstance, type Metric, type NodeName } from './nodes'
import { promQuery, type PromVector } from './prom'

export type Reading = number | null | 'no-sensor'
export interface NodeLive {
  node: NodeName
  online: boolean
  /** ms of the last successful scrape; only set for offline nodes */
  lastSeen: number | null
  values: Record<Metric, Reading>
}

function index(v: PromVector): Map<NodeName, number> {
  const m = new Map<NodeName, number>()
  for (const s of v) {
    const n = nodeByInstance(s.metric.instance ?? '')
    const x = Number(s.value[1])
    if (n && Number.isFinite(x)) m.set(n, x)
  }
  return m
}

export function buildLive(up: PromVector, byMetric: Record<Metric, PromVector>, seen: PromVector = []): NodeLive[] {
  const upIdx = index(up)
  const seenIdx = index(seen)
  const idx = Object.fromEntries(METRICS.map(({ key }) => [key, index(byMetric[key])])) as Record<Metric, Map<NodeName, number>>
  return NODES.map(({ name, hasMemSensor }) => {
    const online = (upIdx.get(name) ?? 0) === 1
    const values = Object.fromEntries(
      METRICS.map(({ key }) => {
        if (!online) return [key, null]
        if (key === 'mem' && !hasMemSensor) return [key, 'no-sensor']
        return [key, idx[key].get(name) ?? null]
      }),
    ) as Record<Metric, Reading>
    const s = seenIdx.get(name)
    return { node: name, online, lastSeen: !online && s !== undefined ? s * 1000 : null, values }
  })
}

export async function fetchLive(): Promise<NodeLive[]> {
  const [up, ...vs] = await Promise.all([promQuery(UP_QUERY), ...METRICS.map(({ key }) => promQuery(QUERIES[key]))])
  const byMetric = Object.fromEntries(METRICS.map(({ key }, i) => [key, vs[i]])) as Record<Metric, PromVector>
  const first = buildLive(up, byMetric)
  // Only pay for the 14d lookback when a node is actually offline.
  if (first.every((n) => n.online)) return first
  return buildLive(up, byMetric, await promQuery(LAST_SEEN_QUERY))
}

/** The hottest CPU among online nodes, for the section heading. */
export function hottestCpu(nodes: NodeLive[]): { node: NodeName; temp: number } | null {
  let best: { node: NodeName; temp: number } | null = null
  for (const n of nodes) {
    const t = n.values.cpu
    if (n.online && typeof t === 'number' && (!best || t > best.temp)) best = { node: n.node, temp: t }
  }
  return best
}
