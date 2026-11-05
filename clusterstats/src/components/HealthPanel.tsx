import type { ReactNode } from 'react'
import { ArrowUpRight, ClockCounterClockwise, Heartbeat } from '@phosphor-icons/react'
import { siCeph, siFlux } from 'simple-icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { GATUS_URL, servicesReading, type Gatus } from '@/lib/gatus'
import { backupReading, cephReading, fluxReading, FLUX_URL, type Health, type Reading } from '@/lib/health'
import type { Tone } from '@/lib/stats'
import { cn } from '@/lib/utils'

const TONE_TEXT: Record<Tone, string> = {
  good: 'text-foreground',
  neutral: 'text-foreground',
  warn: 'text-state-warm',
  bad: 'text-state-hot',
}
const TONE_DOT: Record<Tone, string> = {
  good: 'bg-emerald-400',
  neutral: 'bg-foreground/60',
  warn: 'bg-state-warm',
  bad: 'bg-state-hot',
}
const ICON = 'size-3.5 shrink-0'
const LINK = 'group transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none'

function Brand({ path, hex }: { path: string; hex: string }) {
  return (
    <svg viewBox="0 0 24 24" className={ICON} fill={`#${hex}`} aria-hidden>
      <path d={path} />
    </svg>
  )
}

function Dot({ tone, pulse }: { tone: Tone; pulse?: boolean }) {
  return (
    <span className="relative flex size-1.5 shrink-0">
      {pulse && <span className={cn('absolute inline-flex size-full rounded-full opacity-75 motion-safe:animate-ping', TONE_DOT[tone])} />}
      <span className={cn('relative inline-flex size-1.5 rounded-full', TONE_DOT[tone])} />
    </span>
  )
}

const Arrow = () => (
  <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
)

interface Check {
  key: string
  label: string
  icon: ReactNode
  reading: Reading
  href?: string
}

function checks(health: Health | undefined, gatus: Gatus | undefined): Check[] {
  const none: Reading = { value: null, tone: 'neutral', note: '' }
  return [
    { key: 'services', label: 'Services', icon: <Heartbeat className={ICON} />, reading: gatus ? servicesReading(gatus) : none, href: GATUS_URL },
    { key: 'ceph', label: 'Ceph', icon: <Brand path={siCeph.path} hex={siCeph.hex} />, reading: health ? cephReading(health.ceph) : none },
    { key: 'backup', label: 'Last backup', icon: <ClockCounterClockwise className={ICON} />, reading: health ? backupReading(health.backups) : none },
    { key: 'flux', label: 'Flux sync', icon: <Brand path={siFlux.path} hex={siFlux.hex} />, reading: health ? fluxReading(health.flux) : none, href: FLUX_URL },
  ]
}

function Missing({ className }: { className: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(className, 'text-muted-foreground')}>—</span>
      </TooltipTrigger>
      <TooltipContent>No data</TooltipContent>
    </Tooltip>
  )
}

function MaybeLink({ href, label, className, children }: { href?: string; label: string; className: string; children: ReactNode }) {
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" aria-label={`${label} — open ${new URL(href).host}`} className={cn(className, LINK)}>
      {children}
    </a>
  ) : (
    <div className={className}>{children}</div>
  )
}

/** Health tiles, rendered as bare grid items so they share the Cluster Health grid. */
export function HealthTiles({ health, gatus }: { health?: Health; gatus?: Gatus }) {
  const big = 'truncate text-2xl leading-none font-light tracking-tight sm:text-3xl'
  return (
    <>
      {checks(health, gatus).map(({ key, label, icon, reading, href }) => (
        <MaybeLink
          key={key}
          href={href}
          label={`${label}: ${reading.value ?? 'no data'}`}
          className="flex min-h-32 flex-col justify-between gap-4 bg-card p-4 sm:p-5"
        >
          <span className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {icon}
              {label}
            </span>
            {href && <Arrow />}
          </span>
          {reading.value === null ? <Missing className={big} /> : <span className={cn(big, TONE_TEXT[reading.tone])}>{reading.value}</span>}
          <span className="flex items-center gap-2 truncate text-xs text-muted-foreground">
            {reading.value !== null && <Dot tone={reading.tone} pulse={reading.tone === 'bad'} />}
            <span className="truncate">{reading.note || ' '}</span>
          </span>
        </MaybeLink>
      ))}
    </>
  )
}
