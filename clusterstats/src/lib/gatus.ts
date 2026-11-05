// Gatus endpoint checks, read from the metrics Gatus exports to Prometheus.
import type { Reading } from './health'
import { promQuery, type PromVector } from './prom'

export const GATUS_URL = 'https://status.pipitonelabs.com'

export interface GatusGroup {
  group: string
  up: number
  total: number
  /** Names of failing endpoints in this group. */
  down: string[]
}

export interface Gatus {
  up: number
  total: number
  groups: GatusGroup[]
  /** Average success over the last 24h, as a percentage. */
  availability24h: number | null
}

export const GATUS_QUERIES = {
  success: 'gatus_results_endpoint_success',
  availability: 'avg(avg_over_time(gatus_results_endpoint_success[24h])) * 100',
} as const
type Key = keyof typeof GATUS_QUERIES

const scalar = (v: PromVector | undefined): number | null => {
  const x = v?.[0] ? Number(v[0].value[1]) : NaN
  return Number.isFinite(x) ? x : null
}

export function buildGatus(r: Partial<Record<Key, PromVector>>): Gatus {
  const byGroup = new Map<string, GatusGroup>()
  for (const s of r.success ?? []) {
    const group = s.metric.group || 'other'
    const g = byGroup.get(group) ?? { group, up: 0, total: 0, down: [] }
    g.total++
    if (Number(s.value[1]) === 1) g.up++
    else g.down.push(s.metric.name ?? s.metric.key ?? '?')
    byGroup.set(group, g)
  }
  // Failing groups first, then by name.
  const groups = [...byGroup.values()].sort((a, b) => b.down.length - a.down.length || a.group.localeCompare(b.group))
  return {
    up: groups.reduce((n, g) => n + g.up, 0),
    total: groups.reduce((n, g) => n + g.total, 0),
    groups,
    availability24h: scalar(r.availability),
  }
}

export async function fetchGatus(): Promise<Gatus> {
  const keys = Object.keys(GATUS_QUERIES) as Key[]
  const settled = await Promise.allSettled(keys.map((k) => promQuery(GATUS_QUERIES[k])))
  if (settled.every((s) => s.status === 'rejected')) throw (settled[0] as PromiseRejectedResult).reason
  return buildGatus(Object.fromEntries(keys.map((k, i) => [k, settled[i].status === 'fulfilled' ? settled[i].value : undefined])))
}

export function servicesReading(g: Gatus): Reading {
  if (!g.total) return { value: null, tone: 'neutral', note: '' }
  const down = g.total - g.up
  return {
    value: down ? `${down} down` : `${g.up}/${g.total} up`,
    tone: down ? 'bad' : 'good',
    note: [
      down ? `${g.up}/${g.total} up` : null,
      g.availability24h !== null && `${g.availability24h.toFixed(2)}% over 24h`,
    ]
      .filter(Boolean)
      .join(' · '),
  }
}

