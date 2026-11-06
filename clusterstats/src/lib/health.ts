// Cluster health signals that kromgo has no badge for, queried from Prometheus through the read-only proxy.
import { promQuery, type PromVector } from './prom'
import type { Tone } from './stats'

export const FLUX_URL = 'https://flux.pipitonelabs.com'

export interface Health {
  ceph: {
    status: 0 | 1 | 2 | null
    osdsUp: number | null
    osds: number | null
    // recovering counts PGs recovering or backfilling, or queued to.
    pgs: { total: number | null; clean: number | null; degraded: number | null; undersized: number | null; recovering: number | null }
    // Rook daemon deployments (mon, mgr, osd, mds and the operator) not fully available, from kube-state-metrics; null when it
    // has no data. upgrading is the subset whose spec changed recently (a real rollout); the rest are restarting (node reboot,
    // crashed pod).
    rolling: { names: string[]; upgrading: string[]; total: number } | null
  }
  backups: { oldestAgeSec: number | null; apps: number | null; outOfSync: number | null }
  flux: { total: number | null; syncing: number | null; failing: number | null; suspended: number | null }
}

// Rook daemons and the operator. Rolling = fewer replicas available or updated than wanted, held for 2m so a brief flap
// (or the gap between two daemons restarting one after another) doesn't flicker the tile.
const ROOK = '{namespace="rook-ceph",deployment=~"rook-ceph-(mon|mgr|osd|mds|operator).*"}'
const ROLLING = `(kube_deployment_spec_replicas${ROOK} - kube_deployment_status_replicas_available${ROOK} > 0) or (kube_deployment_spec_replicas${ROOK} - kube_deployment_status_replicas_updated${ROOK} > 0)`
// A deployment whose spec changed in the last 15m is being rolled out (new image or settings); without a change it is restarting.
const SPEC_CHANGED = `max by (deployment) (changes(kube_deployment_metadata_generation${ROOK}[15m]) > 0)`

export const HEALTH_QUERIES = {
  cephStatus: 'ceph_health_status',
  osdsUp: 'sum(ceph_osd_up)',
  osds: 'count(ceph_osd_up)',
  pgTotal: 'sum(ceph_pg_total)',
  pgClean: 'sum(ceph_pg_clean)',
  pgDegraded: 'sum(ceph_pg_degraded)',
  pgUndersized: 'sum(ceph_pg_undersized)',
  pgRecovering: 'sum(ceph_pg_recovering) + sum(ceph_pg_backfilling) + sum(ceph_pg_recovery_wait) + sum(ceph_pg_backfill_wait)',
  cephRolling: `max by (deployment) (max_over_time((${ROLLING})[2m:30s]))`,
  cephUpgrading: SPEC_CHANGED,
  cephDaemons: `count(kube_deployment_spec_replicas${ROOK})`,
  // Per app, when its source last finished a sync (within a day); report the app that has gone longest.
  oldestBackupAge:
    'time() - min(max by (obj_namespace, obj_name) (max_over_time(timestamp(changes(volsync_sync_duration_seconds_count{role="source"}[5m]) > 0)[1d:5m])))',
  backupApps: 'count(volsync_sync_duration_seconds_count{role="source"})',
  outOfSync: 'sum(volsync_volume_out_of_sync)',
  fluxTotal: 'count(flux_resource_info)',
  // Not ready right now. Kustomizations go Ready=Unknown/False while a new revision reconciles, so this is usually transient.
  fluxSyncing: 'count(flux_resource_info{ready!="True",suspended="False"}) or vector(0)',
  // Not ready for every sample of the last 5m. Normalised per resource (1 = not ready, 0 = ready) because the revision/reason
  // labels change between scrapes. A resource younger than 5m is judged on the samples it has.
  fluxFailing:
    'count(min_over_time((max by (exported_namespace, kind, name) (flux_resource_info{ready!="True",suspended="False"}) or max by (exported_namespace, kind, name) (flux_resource_info) * 0)[5m:30s]) == 1) or vector(0)',
  fluxSuspended: 'count(flux_resource_info{suspended="True"}) or vector(0)',
} as const
type Key = keyof typeof HEALTH_QUERIES

const scalar = (v: PromVector | undefined): number | null => {
  const x = v?.[0] ? Number(v[0].value[1]) : NaN
  return Number.isFinite(x) ? x : null
}

const deployments = (v: PromVector | undefined): string[] => (v ?? []).map((m) => m.metric.deployment ?? '').filter(Boolean).sort()

export function buildHealth(r: Partial<Record<Key, PromVector>>): Health {
  const status = scalar(r.cephStatus)
  const daemons = scalar(r.cephDaemons)
  return {
    ceph: {
      status: status === 0 || status === 1 || status === 2 ? status : null,
      osdsUp: scalar(r.osdsUp),
      osds: scalar(r.osds),
      pgs: {
        total: scalar(r.pgTotal),
        clean: scalar(r.pgClean),
        degraded: scalar(r.pgDegraded),
        undersized: scalar(r.pgUndersized),
        recovering: scalar(r.pgRecovering),
      },
      rolling: daemons === null ? null : { names: deployments(r.cephRolling), upgrading: deployments(r.cephUpgrading), total: daemons },
    },
    backups: { oldestAgeSec: scalar(r.oldestBackupAge), apps: scalar(r.backupApps), outOfSync: scalar(r.outOfSync) },
    flux: { total: scalar(r.fluxTotal), syncing: scalar(r.fluxSyncing), failing: scalar(r.fluxFailing), suspended: scalar(r.fluxSuspended) },
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

/** "rook-ceph-mon-c" -> "mon c", "rook-ceph-mds-ceph-filesystem-a" -> "mds a", "rook-ceph-operator" -> "operator". */
const daemonName = (d: string) => d.replace(/^rook-ceph-/, '').replace(/^mds-ceph-filesystem-/, 'mds-').replace('-', ' ')

/** "Upgrading" when any unavailable daemon is mid-rollout, otherwise "Restarting" (node reboot, crashed pod). */
function rollingState({ names, upgrading, total }: NonNullable<Health['ceph']['rolling']>): { value: string; note: string } {
  const upgrade = names.some((n) => upgrading.includes(n))
  const verb = upgrade ? 'upgrading' : 'restarting'
  const named = names.map(daemonName).join(', ')
  const note = names.length > 1 && named.length > 18 ? `${names.length} of ${total} daemons ${verb}` : `${named} ${verb}`
  return { value: upgrade ? 'Upgrading' : 'Restarting', note }
}

function pgNote({ total, clean, degraded, undersized, recovering }: Health['ceph']['pgs']): string | null {
  if (recovering) return `${recovering} PGs recovering`
  if (degraded) return `${degraded} PGs degraded`
  if (undersized) return `${undersized} PGs undersized`
  if (total === null || clean === null) return null
  return clean < total ? `PGs ${clean}/${total} clean` : `${total} PGs clean`
}

export function cephReading({ status, osdsUp, osds, pgs, rolling }: Health['ceph']): Reading {
  const rollingNow = rolling !== null && rolling.names.length > 0
  if (status === null) {
    // Ceph's own metrics vanish while the mons/mgr restart; Kubernetes still says what is happening.
    return rollingNow ? { tone: 'warn', ...rollingState(rolling) } : { value: null, tone: 'neutral', note: '' }
  }
  const c = CEPH[status]
  const osdsDown = osdsUp !== null && osds !== null && osdsUp < osds
  const detail = [osds !== null && `${osdsUp ?? 0}/${osds} OSDs up`, pgNote(pgs)]
  // An error is never softened; an OK/WARN cluster with daemons down or PGs out of place says what is going on.
  if (status !== 2) {
    if (rollingNow) {
      const s = rollingState(rolling)
      return { value: s.value, tone: 'warn', note: [s.note, ...detail].filter(Boolean).join(' · ') }
    }
    // Daemons are all back; PG trouble goes first in the note.
    if (pgs.recovering) return { value: 'Recovering', tone: 'warn', note: [detail[1], detail[0]].filter(Boolean).join(' · ') }
    if (pgs.degraded || pgs.undersized) return { value: 'Degraded', tone: 'warn', note: [c.code, detail[1], detail[0]].filter(Boolean).join(' · ') }
  }
  const tone: Tone = osdsDown && c.tone === 'good' ? 'warn' : c.tone
  // "Healthy" already says HEALTH_OK, which would not fit the tile; problems keep the Ceph code. PG trouble goes first.
  const pgFirst = pgs.degraded || pgs.undersized || pgs.recovering ? [detail[1], detail[0]] : detail
  return { value: c.value, tone, note: [status === 0 ? null : c.code, ...pgFirst].filter(Boolean).join(' · ') }
}

export function backupReading({ oldestAgeSec, apps, outOfSync }: Health['backups']): Reading {
  if (oldestAgeSec === null) return { value: null, tone: 'neutral', note: '' }
  const tone: Tone = (outOfSync ?? 0) > 0 || oldestAgeSec > 6 * 3600 ? 'bad' : oldestAgeSec > 2 * 3600 ? 'warn' : 'good'
  const parts = [apps !== null && `oldest of ${apps} apps`, outOfSync ? `${outOfSync} out of sync` : null].filter(Boolean)
  return { value: `${humanAge(oldestAgeSec)} ago`, tone, note: parts.join(' · ') }
}

export function fluxReading({ total, syncing, failing, suspended }: Health['flux']): Reading {
  if (total === null || failing === null) return { value: null, tone: 'neutral', note: '' }
  const parts = [`${total} resources`, suspended ? `${suspended} suspended` : null].filter(Boolean)
  if (failing > 0) return { value: `${failing} failing`, tone: 'bad', note: parts.join(' · ') }
  if (syncing) return { value: 'Syncing', tone: 'warn', note: [`${syncing} updating`, ...parts].join(' · ') }
  return { value: 'All synced', tone: suspended ? 'warn' : 'good', note: parts.join(' · ') }
}
