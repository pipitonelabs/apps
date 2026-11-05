// Cluster health signals that kromgo has no badge for, queried from Prometheus through the read-only proxy.
import { promQuery, type PromVector } from './prom'
import type { Tone } from './stats'

export const FLUX_URL = 'https://flux.pipitonelabs.com'

export interface Health {
  ceph: { status: 0 | 1 | 2 | null; osdsUp: number | null; osds: number | null }
  backups: { oldestAgeSec: number | null; apps: number | null; outOfSync: number | null }
  flux: { total: number | null; failing: number | null; suspended: number | null }
}

export const HEALTH_QUERIES = {
  cephStatus: 'ceph_health_status',
  osdsUp: 'sum(ceph_osd_up)',
  osds: 'count(ceph_osd_up)',
  // Per app, when its source last finished a sync (within a day); report the app that has gone longest.
  oldestBackupAge:
    'time() - min(max by (obj_namespace, obj_name) (max_over_time(timestamp(changes(volsync_sync_duration_seconds_count{role="source"}[5m]) > 0)[1d:5m])))',
  backupApps: 'count(volsync_sync_duration_seconds_count{role="source"})',
  outOfSync: 'sum(volsync_volume_out_of_sync)',
  fluxTotal: 'count(flux_resource_info)',
  fluxFailing: 'count(flux_resource_info{ready!="True",suspended="False"}) or vector(0)',
  fluxSuspended: 'count(flux_resource_info{suspended="True"}) or vector(0)',
} as const
type Key = keyof typeof HEALTH_QUERIES

const scalar = (v: PromVector | undefined): number | null => {
  const x = v?.[0] ? Number(v[0].value[1]) : NaN
  return Number.isFinite(x) ? x : null
}

export function buildHealth(r: Partial<Record<Key, PromVector>>): Health {
  const status = scalar(r.cephStatus)
  return {
    ceph: { status: status === 0 || status === 1 || status === 2 ? status : null, osdsUp: scalar(r.osdsUp), osds: scalar(r.osds) },
    backups: { oldestAgeSec: scalar(r.oldestBackupAge), apps: scalar(r.backupApps), outOfSync: scalar(r.outOfSync) },
    flux: { total: scalar(r.fluxTotal), failing: scalar(r.fluxFailing), suspended: scalar(r.fluxSuspended) },
  }
}

export async function fetchHealth(): Promise<Health> {
  const keys = Object.keys(HEALTH_QUERIES) as Key[]
  const settled = await Promise.allSettled(keys.map((k) => promQuery(HEALTH_QUERIES[k])))
  if (settled.every((s) => s.status === 'rejected')) throw (settled[0] as PromiseRejectedResult).reason
  return buildHealth(Object.fromEntries(keys.map((k, i) => [k, settled[i].status === 'fulfilled' ? settled[i].value : undefined])))
}

/** "44m", "3h 5m", "2d 4h". */
export function humanAge(sec: number): string {
  const m = Math.floor(sec / 60)
  if (m < 60) return `${Math.max(m, 0)}m`
  const h = Math.floor(m / 60)
  if (h < 24) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`
  const d = Math.floor(h / 24)
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`
}

export interface Reading {
  value: string | null
  tone: Tone
  note: string
}

const CEPH: Record<0 | 1 | 2, { value: string; tone: Tone; code: string }> = {
  0: { value: 'Healthy', tone: 'good', code: 'HEALTH_OK' },
  1: { value: 'Warning', tone: 'warn', code: 'HEALTH_WARN' },
  2: { value: 'Error', tone: 'bad', code: 'HEALTH_ERR' },
}

export function cephReading({ status, osdsUp, osds }: Health['ceph']): Reading {
  if (status === null) return { value: null, tone: 'neutral', note: '' }
  const c = CEPH[status]
  const osdsDown = osdsUp !== null && osds !== null && osdsUp < osds
  const tone: Tone = osdsDown && c.tone === 'good' ? 'warn' : c.tone
  return { value: c.value, tone, note: [c.code, osds !== null && `${osdsUp ?? 0}/${osds} OSDs up`].filter(Boolean).join(' · ') }
}

export function backupReading({ oldestAgeSec, apps, outOfSync }: Health['backups']): Reading {
  if (oldestAgeSec === null) return { value: null, tone: 'neutral', note: '' }
  const tone: Tone = (outOfSync ?? 0) > 0 || oldestAgeSec > 6 * 3600 ? 'bad' : oldestAgeSec > 2 * 3600 ? 'warn' : 'good'
  const parts = [apps !== null && `oldest of ${apps} apps`, outOfSync ? `${outOfSync} out of sync` : null].filter(Boolean)
  return { value: `${humanAge(oldestAgeSec)} ago`, tone, note: parts.join(' · ') }
}

export function fluxReading({ total, failing, suspended }: Health['flux']): Reading {
  if (total === null || failing === null) return { value: null, tone: 'neutral', note: '' }
  const parts = [`${total} resources`, suspended ? `${suspended} suspended` : null].filter(Boolean)
  return failing > 0
    ? { value: `${failing} failing`, tone: 'bad', note: parts.join(' · ') }
    : { value: 'All synced', tone: suspended ? 'warn' : 'good', note: parts.join(' · ') }
}

