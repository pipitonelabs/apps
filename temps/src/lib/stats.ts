// Cluster-wide stats come from kromgo (the same source as the README badges), proxied by nginx at /kromgo/<id>.

export const STAT_IDS = [
  'talos_version',
  'kubernetes_version',
  'flux_version',
  'cluster_uptime_age',
  'cluster_node_count',
  'cluster_pod_count',
  'cluster_cpu_usage',
  'cluster_memory_usage',
  'cluster_alert_count',
] as const
export type StatId = (typeof STAT_IDS)[number]

export type Tone = 'good' | 'warn' | 'bad' | 'neutral'

export interface Stat {
  id: StatId
  /** Display value as kromgo formats it, or null when kromgo has no data. */
  value: string | null
  /** Raw numeric result, when there is one. */
  result: number | null
  tone: Tone
}

const TONES: Record<string, Tone> = { green: 'good', orange: 'warn', yellow: 'warn', red: 'bad' }

export function parseBadge(id: StatId, body: { value?: string; color?: string; result?: number }): Stat {
  const value = body.value && body.value !== 'no data' ? body.value : null
  const result = typeof body.result === 'number' && Number.isFinite(body.result) ? body.result : null
  return { id, value, result: value === null ? null : result, tone: (body.color && TONES[body.color]) || 'neutral' }
}

const BASE = (typeof process !== 'undefined' && process.env?.KROMGO_BASE) || ''

async function fetchStat(id: StatId): Promise<Stat> {
  const res = await fetch(`${BASE}/kromgo/${id}`)
  if (!res.ok) throw new Error(`kromgo ${id}: HTTP ${res.status}`)
  return parseBadge(id, await res.json())
}

/** Fetches every stat; a single failing badge shows as no data rather than failing the whole strip. */
export async function fetchStats(): Promise<Record<StatId, Stat>> {
  const settled = await Promise.allSettled(STAT_IDS.map(fetchStat))
  if (settled.every((s) => s.status === 'rejected')) throw (settled[0] as PromiseRejectedResult).reason
  return Object.fromEntries(
    settled.map((s, i) => [
      STAT_IDS[i],
      s.status === 'fulfilled' ? s.value : { id: STAT_IDS[i], value: null, result: null, tone: 'neutral' as Tone },
    ]),
  ) as Record<StatId, Stat>
}
