import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { NodeLive, Reading } from '@/lib/live'
import { NODES, type Metric } from '@/lib/nodes'
import { THRESHOLDS, tempState, type TempState } from '@/lib/thresholds'
import { cn } from '@/lib/utils'

const STATE_TEXT: Record<TempState, string> = {
  normal: 'text-foreground',
  warm: 'text-state-warm',
  hot: 'text-state-hot',
  none: 'text-muted-foreground',
}
const STATE_BG: Record<TempState, string> = {
  normal: 'bg-foreground/80',
  warm: 'bg-state-warm',
  hot: 'bg-state-hot',
  none: 'bg-muted',
}

const etTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })

function useTween(target: number | null, ms = 600): number | null {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    if (target === null || from.current === null) {
      from.current = target
      setV(target)
      return
    }
    const a = from.current
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms)
      setV(a + (target - a) * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(step)
      else from.current = target
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

// Bar spans 20–100 °C; the tick marks the warm threshold.
const pct = (x: number) => Math.max(0, Math.min(100, ((x - 20) / 80) * 100))

function Value({ metric, value, size }: { metric: Metric; value: Reading; size: 'lg' | 'md' }) {
  const state = tempState(metric, value)
  const shown = useTween(typeof value === 'number' ? value : null)
  const num = size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'
  if (value === null)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(num, 'leading-none font-light text-muted-foreground')}>—</span>
        </TooltipTrigger>
        <TooltipContent>No data</TooltipContent>
      </Tooltip>
    )
  if (typeof value !== 'number') return null
  return (
    <span className={cn('leading-none', STATE_TEXT[state])}>
      <span className={cn(num, 'font-light tracking-tight tabular-nums')}>{(shown ?? value).toFixed(1)}</span>
      <span className="ml-0.5 text-xs text-muted-foreground sm:ml-1 sm:text-sm">°C</span>
    </span>
  )
}

function Bar({ metric, value }: { metric: Metric; value: Reading }) {
  const state = tempState(metric, value)
  return (
    <div className="relative h-0.5 w-full rounded-full bg-foreground/10">
      {typeof value === 'number' && (
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-700', STATE_BG[state])}
          style={{ width: `${pct(value)}%` }}
        />
      )}
      <div className="absolute -top-0.5 h-1.5 w-px bg-foreground/30" style={{ left: `${pct(THRESHOLDS[metric].warm)}%` }} />
    </div>
  )
}

const SUB: { key: Metric; label: string }[] = [
  { key: 'nvme0', label: 'NVMe 0' },
  { key: 'nvme1', label: 'NVMe 1' },
  { key: 'mem', label: 'Memory' },
]

export function NodeCard({ live }: { live: NodeLive }) {
  const meta = NODES.find((n) => n.name === live.node)!
  const { lastSeen } = live
  const subs = SUB.filter(({ key }) => meta.hasMemSensor || key !== 'mem')
  return (
    <Card className={cn('min-h-72 justify-between gap-6 rounded-lg border-0 p-5 sm:p-6 ring-1 ring-border', !live.online && 'opacity-60')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-2xl font-medium">{live.node}</span>
          <span className="text-xs leading-relaxed text-muted-foreground">
            {meta.hw}
            <br />
            {meta.ip}
          </span>
          {live.online ? (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="pulse-dot size-1.5 rounded-full bg-emerald-400" /> Online
            </span>
          ) : (
            <span className="flex flex-col gap-0.5 text-xs">
              <span className="flex items-center gap-2 text-state-hot">
                <span className="size-1.5 rounded-full bg-state-hot" /> Offline
              </span>
              {lastSeen ? <span className="text-muted-foreground">Last seen {etTime(lastSeen)}</span> : null}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-xs text-muted-foreground">CPU</span>
          <Value metric="cpu" value={live.values.cpu} size="lg" />
        </div>
      </div>
      <Bar metric="cpu" value={live.values.cpu} />
      <div className="grid grid-cols-3 gap-3 border-t sm:gap-5 border-border pt-5">
        {subs.map(({ key, label }) => (
          <div key={key} className="flex min-w-0 flex-col gap-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <Value metric={key} value={live.values[key]} size="md" />
            <Bar metric={key} value={live.values[key]} />
          </div>
        ))}
      </div>
    </Card>
  )
}
