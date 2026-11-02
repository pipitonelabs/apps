import { Badge } from '@/components/ui/badge'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LiveGrid } from '@/components/LiveGrid'
import { Timelines } from '@/components/Timelines'
import { usePoll } from '@/hooks/usePoll'
import { fetchLive } from '@/lib/live'

const LIVE_MS = 10_000

const etClock = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit' })

export default function App() {
  const live = usePoll(fetchLive, LIVE_MS)

  return (
    <TooltipProvider>
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-8 px-[max(16px,env(safe-area-inset-left))] py-8 md:px-10">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] tracking-[0.35em] text-primary uppercase">pipitonelabs · k8s</span>
            <h1 className="font-heading text-3xl font-bold tracking-[0.2em] uppercase md:text-4xl">Thermals</h1>
          </div>
          <div className="flex items-center gap-3 text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            {live.stale && <Badge variant="destructive">data stale</Badge>}
            <span className="flex items-center gap-2">
              <span className="pulse-dot size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
              live · {LIVE_MS / 1000}s
            </span>
            <span className="tabular-nums">{live.updatedAt ? `${etClock(live.updatedAt)} ET` : 'connecting…'}</span>
          </div>
        </header>

        {live.data ? (
          <LiveGrid nodes={live.data} />
        ) : (
          <div className="py-20 text-center text-xs tracking-[0.3em] text-muted-foreground uppercase">
            {live.error ? 'prometheus unreachable — retrying' : 'acquiring telemetry…'}
          </div>
        )}

        <Timelines />
      </div>
    </TooltipProvider>
  )
}
