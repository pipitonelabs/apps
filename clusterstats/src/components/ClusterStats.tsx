import type { ReactNode } from 'react'
import { ArrowUpRight, Bell, Cake, Clock, Cpu, Cube, HardDrives, Memory, Monitor } from '@phosphor-icons/react'
import { siFlux, siGithub, siKubernetes, siTalos, type SimpleIcon } from 'simple-icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PULLS_URL, type OpenPrs } from '@/lib/github'
import type { Stat, StatId, Tone } from '@/lib/stats'
import { KUBEVIRT_MANAGER_URL, vmNote, type Vms } from '@/lib/vms'
import { cn } from '@/lib/utils'

export const ALERTMANAGER_URL = 'https://alertmanager.pipitonelabs.com'

const TONE_TEXT: Record<Tone, string> = {
  good: 'text-foreground',
  neutral: 'text-foreground',
  warn: 'text-state-warm',
  bad: 'text-state-hot',
}
const TONE_BG: Record<Tone, string> = {
  good: 'bg-emerald-400',
  neutral: 'bg-foreground/80',
  warn: 'bg-state-warm',
  bad: 'bg-state-hot',
}

function Brand({ icon, mono }: { icon: SimpleIcon; mono?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill={mono ? 'currentColor' : `#${icon.hex}`} aria-hidden>
      <path d={icon.path} />
    </svg>
  )
}

const ICON = 'size-3.5 shrink-0'

interface TileDef {
  id: StatId
  label: string
  icon: ReactNode
  prefix?: string
  /** Second line under the value. */
  note?: (s: Stat) => ReactNode
  /** Draw a 0–100% bar under the value. */
  bar?: boolean
  missing?: string
  /** Ignore kromgo's colour (e.g. Age turns red after a year, which is not a problem). */
  toneless?: boolean
}

const TILES: TileDef[] = [
  { id: 'talos_version', label: 'Talos', icon: <Brand icon={siTalos} />, prefix: 'v' },
  { id: 'kubernetes_version', label: 'Kubernetes', icon: <Brand icon={siKubernetes} />, prefix: 'v' },
  { id: 'flux_version', label: 'Flux', icon: <Brand icon={siFlux} />, prefix: 'v' },
  { id: 'cluster_birth_age', label: 'Age', icon: <Cake className={ICON} />, note: () => 'since first node', toneless: true },
  { id: 'cluster_uptime_age', label: 'Uptime', icon: <Clock className={ICON} />, note: () => 'avg across nodes' },
  { id: 'cluster_node_count', label: 'Nodes', icon: <HardDrives className={ICON} />, note: () => 'ready' },
  { id: 'cluster_pod_count', label: 'Pods', icon: <Cube className={ICON} />, note: () => 'running' },
  { id: 'cluster_cpu_usage', label: 'CPU', icon: <Cpu className={ICON} />, bar: true },
  { id: 'cluster_memory_usage', label: 'Memory', icon: <Memory className={ICON} />, bar: true },
]

function Value({ stat, def }: { stat: Stat | undefined; def: Pick<TileDef, 'prefix' | 'missing'> }) {
  const cls = 'truncate text-2xl leading-none font-light tracking-tight tabular-nums sm:text-3xl'
  if (!stat?.value)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(cls, 'text-muted-foreground')}>—</span>
        </TooltipTrigger>
        <TooltipContent>{def.missing ?? 'No data'}</TooltipContent>
      </Tooltip>
    )
  return (
    <span className={cn(cls, TONE_TEXT[stat.tone])}>
      {def.prefix && <span className="text-muted-foreground">{def.prefix}</span>}
      {stat.value}
    </span>
  )
}

function Bar({ stat }: { stat: Stat | undefined }) {
  const pct = stat?.result === null || stat?.result === undefined ? null : Math.max(0, Math.min(100, stat.result))
  return (
    <div className="relative h-0.5 w-full rounded-full bg-foreground/10">
      {pct !== null && (
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-700', TONE_BG[stat!.tone])}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  )
}

const TILE = 'flex min-h-32 flex-col justify-between gap-4 bg-card p-4 sm:p-5'

function Label({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      {icon}
      {children}
    </span>
  )
}

function AlertsTile({ stat }: { stat: Stat | undefined }) {
  const count = stat?.result ?? null
  const firing = count !== null && count > 0
  return (
    <a
      href={ALERTMANAGER_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={`Alerts: ${stat?.value ?? 'no data'} — open Alertmanager`}
      className={cn(
        TILE,
        'group relative transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
        firing && 'bg-[color-mix(in_oklch,var(--state-hot)_7%,var(--card))] hover:bg-[color-mix(in_oklch,var(--state-hot)_12%,var(--card))]',
      )}
    >
      {firing && <span aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-state-hot/40 motion-safe:animate-pulse" />}
      <span className="flex items-center justify-between">
        <Label icon={<Bell className={cn(ICON, firing && 'text-state-hot')} weight={firing ? 'fill' : 'regular'} />}>Alerts</Label>
        <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </span>
      <Value stat={stat} def={{}} />
      <span className={cn('flex items-center gap-2 text-xs', firing ? 'text-state-hot' : 'text-muted-foreground')}>
        {count === null ? (
          'Alertmanager'
        ) : firing ? (
          <>
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full rounded-full bg-state-hot opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex size-1.5 rounded-full bg-state-hot" />
            </span>
            firing
          </>
        ) : (
          <>
            <span className="size-1.5 rounded-full bg-emerald-400" /> all clear
          </>
        )}
      </span>
    </a>
  )
}

function VmsTile({ vms }: { vms: Vms | undefined }) {
  return (
    <a
      href={KUBEVIRT_MANAGER_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={`VMs: ${vms ? vmNote(vms) : 'no data'} — open kubevirt-manager`}
      className={cn(TILE, 'group transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none')}
    >
      <span className="flex items-center justify-between">
        <Label icon={<Monitor className={ICON} />}>VMs</Label>
        <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </span>
      <Value stat={vms ? { id: 'cluster_pod_count', value: String(vms.total ?? vms.running), result: vms.running, tone: 'neutral' } : undefined} def={{}} />
      <span className="truncate text-xs text-muted-foreground">{vms ? vmNote(vms) : '\u00a0'}</span>
    </a>
  )
}

function PrsTile({ prs }: { prs: OpenPrs | undefined }) {
  const parts = prs ? [prs.mine && `${prs.mine} yours`, prs.bots && `${prs.bots} Renovate`, prs.others && `${prs.others} other`].filter(Boolean) : []
  return (
    <a
      href={PULLS_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open PRs: ${prs?.total ?? 'no data'} — open GitHub`}
      className={cn(TILE, 'group transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none')}
    >
      <span className="flex items-center justify-between">
        <Label icon={<Brand icon={siGithub} mono />}>Open PRs</Label>
        <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </span>
      <Value stat={prs ? { id: 'cluster_alert_count', value: String(prs.total), result: prs.total, tone: 'neutral' } : undefined} def={{ missing: 'GitHub unreachable' }} />
      <span className="truncate text-xs text-muted-foreground">{prs ? (parts.length ? parts.join(' · ') : 'none open') : '\u00a0'}</span>
    </a>
  )
}

function StatTile({ def, stat: raw }: { def: TileDef; stat: Stat | undefined }) {
  const stat = raw && def.toneless ? { ...raw, tone: 'neutral' as Tone } : raw
  return (
    <div className={TILE}>
      <Label icon={def.icon}>{def.label}</Label>
      <Value stat={stat} def={def} />
      {def.bar ? (
        <Bar stat={stat} />
      ) : (
        <span className="text-xs text-muted-foreground">{stat?.value && def.note ? def.note(stat) : '\u00a0'}</span>
      )}
    </div>
  )
}

export function ClusterStats({
  stats,
  prs,
  vms,
  health,
}: {
  stats: Partial<Record<StatId, Stat>>
  prs?: OpenPrs
  vms?: Vms
  /** Health tiles, placed after Memory so Alerts and Open PRs stay last. */
  health?: ReactNode
}) {
  // 16 tiles: 4 rows of 4, or 2 rows of 8 on wide screens. VMs sit right after Pods.
  const split = TILES.findIndex((t) => t.id === 'cluster_pod_count') + 1
  return (
    <section
      aria-label="Cluster health"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border ring-1 ring-border md:grid-cols-4 2xl:grid-cols-8"
    >
      {TILES.slice(0, split).map((def) => (
        <StatTile key={def.id} def={def} stat={stats[def.id]} />
      ))}
      <VmsTile vms={vms} />
      {TILES.slice(split).map((def) => (
        <StatTile key={def.id} def={def} stat={stats[def.id]} />
      ))}
      {health}
      <AlertsTile stat={stats.cluster_alert_count} />
      <PrsTile prs={prs} />
    </section>
  )
}
