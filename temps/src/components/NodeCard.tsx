import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { NodeLive, Reading } from '@/lib/live'
import { METRICS, NODES, type Metric } from '@/lib/nodes'
import { THRESHOLDS, tempState, type TempState } from '@/lib/thresholds'
import { cn } from '@/lib/utils'

const STATE_TEXT: Record<TempState, string> = {
  normal: 'text-state-normal',
  warm: 'text-state-warm',
  hot: 'text-state-hot',
  none: 'text-muted-foreground',
}
const STATE_BG: Record<TempState, string> = {
  normal: 'bg-state-normal',
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
      const x = a + (target - a) * (1 - Math.pow(1 - k, 3))
      setV(x)
      if (k < 1) raf = requestAnimationFrame(step)
      else from.current = target
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

function ReadingCell({ metric, label, value }: { metric: Metric; label: string; value: Reading }) {
  const state = tempState(metric, value)
  const shown = useTween(typeof value === 'number' ? value : null)
  // Bar spans 20–100 °C; the tick marks the warm threshold.
  const pct = (x: number) => Math.max(0, Math.min(100, ((x - 20) / 80) * 100))
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">{label}</span>
      {value === 'no-sensor' ? (
        <span className="py-2 text-xs tracking-wider text-muted-foreground uppercase">no sensor</span>
      ) : value === null ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-3xl leading-none text-muted-foreground">—</span>
          </TooltipTrigger>
          <TooltipContent>no data</TooltipContent>
        </Tooltip>
      ) : (
        <span className={cn('glow-text leading-none', STATE_TEXT[state])}>
          <span className="text-4xl font-light tabular-nums">{shown!.toFixed(1)}</span>
          <span className="ml-1 text-sm opacity-70">°C</span>
        </span>
      )}
      <div className="relative h-1 w-full rounded-full bg-muted/60">
        {typeof value === 'number' && (
          <div
            className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-700', STATE_BG[state])}
            style={{ width: `${pct(value)}%`, boxShadow: '0 0 10px currentColor' }}
          />
        )}
        <div className="absolute -top-0.5 h-2 w-px bg-state-warm/70" style={{ left: `${pct(THRESHOLDS[metric].warm)}%` }} />
      </div>
    </div>
  )
}

export function NodeCard({ live, lastSeen }: { live: NodeLive; lastSeen: number | null | undefined }) {
  const meta = NODES.find((n) => n.name === live.node)!
  return (
    <Card className={cn('glow-edge rounded-2xl backdrop-blur-md', !live.online && 'opacity-70')}>
      <CardHeader className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-heading text-2xl font-semibold tracking-[0.15em] uppercase">{live.node}</span>
          <span className="text-[10px] leading-relaxed tracking-[0.18em] text-muted-foreground uppercase">
            {meta.hw}
            <br />
            {meta.ip}
          </span>
        </div>
        {live.online ? (
          <span className="flex items-center gap-2 text-[10px] tracking-[0.2em] text-state-normal uppercase">
            <span className="pulse-dot size-2 rounded-full bg-state-normal shadow-[0_0_10px_var(--state-normal)]" />
            online
          </span>
        ) : (
          <span className="flex flex-col items-end gap-0.5 text-[10px] tracking-[0.2em] text-state-hot uppercase">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-state-hot" /> offline
            </span>
            {lastSeen ? <span className="text-muted-foreground">last seen {etTime(lastSeen)}</span> : null}
          </span>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-6 gap-y-5">
        {METRICS.map(({ key, label }) => (
          <ReadingCell key={key} metric={key} label={label} value={live.values[key]} />
        ))}
      </CardContent>
    </Card>
  )
}
