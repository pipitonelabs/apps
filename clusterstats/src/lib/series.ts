import { NODES, QUERIES, nodeByInstance, type Metric, type NodeName } from './nodes'
import { promRange, type PromMatrix } from './prom'

export type RangeKey = '1h' | '6h' | '24h' | '7d' | '14d'
export const RANGES: Record<RangeKey, number> = {
  '1h': 3600,
  '6h': 6 * 3600,
  '24h': 86400,
  '7d': 7 * 86400,
  '14d': 14 * 86400,
}
export const DEFAULT_RANGE: RangeKey = '24h'

export type ChartRow = { t: number } & Partial<Record<NodeName, number | null>>

export function stepFor(rangeSeconds: number): number {
  return Math.max(15, Math.ceil(rangeSeconds / 400))
}

export function toChartRows(m: PromMatrix, start: number, end: number, step: number): ChartRow[] {
  const n = Math.floor((end - start) / step) + 1
  const rows: ChartRow[] = Array.from({ length: n }, (_, i) => {
    const r: ChartRow = { t: (start + i * step) * 1000 }
    for (const { name } of NODES) r[name] = null
    return r
  })
  for (const s of m) {
    const node = nodeByInstance(s.metric.instance ?? '')
    if (!node) continue
    for (const [t, v] of s.values) {
      const i = Math.round((t - start) / step)
      const x = Number(v)
      if (i >= 0 && i < n && Number.isFinite(x)) rows[i][node] = x
    }
  }
  return rows
}

export function lastSeen(m: PromMatrix, node: NodeName): number | null {
  const s = m.find((x) => nodeByInstance(x.metric.instance ?? '') === node)
  const last = s?.values.at(-1)
  return last ? last[0] * 1000 : null
}

export async function fetchSeries(
  metric: Metric,
  range: RangeKey,
): Promise<{ rows: ChartRow[]; lastSeen: Partial<Record<NodeName, number | null>>; start: number; end: number }> {
  const step = stepFor(RANGES[range])
  const end = Math.floor(Date.now() / 1000 / step) * step
  const start = end - RANGES[range]
  const m = await promRange(QUERIES[metric], start, end, step)
  return {
    rows: toChartRows(m, start, end, step),
    lastSeen: Object.fromEntries(NODES.map(({ name }) => [name, lastSeen(m, name)])),
    start: start * 1000,
    end: end * 1000,
  }
}
