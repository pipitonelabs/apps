import { Badge } from '@/components/ui/badge'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LiveGrid } from '@/components/LiveGrid'
import { Timelines } from '@/components/Timelines'
import { usePoll } from '@/hooks/usePoll'
import { fetchLive } from '@/lib/live'

const LIVE_MS = 10_000
const WRAP = 'mx-auto w-full max-w-[1800px] px-[max(16px,env(safe-area-inset-left))] md:px-10'

const etClock = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit' })

export default function App() {
  const live = usePoll(fetchLive, LIVE_MS)

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className={`${WRAP} flex flex-wrap items-center justify-between gap-4 py-5`}>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-medium tracking-tight">Thermals</h1>
            <span className="text-sm text-muted-foreground">pipitonelabs k8s</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {live.stale && <Badge variant="destructive">Data stale</Badge>}
            <span className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-foreground">
              <span className="pulse-dot size-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
            <span className="tabular-nums">{live.updatedAt ? `${etClock(live.updatedAt)} ET` : 'Connecting…'}</span>
          </div>
        </div>
      </header>

      <main className={`${WRAP} flex flex-col gap-12 py-8`}>
        {live.data ? (
          <LiveGrid nodes={live.data} />
        ) : (
          <div className="py-20 text-center text-sm text-muted-foreground">
            {live.error ? 'Prometheus unreachable — retrying' : 'Loading…'}
          </div>
        )}
        <Timelines />
      </main>
    </TooltipProvider>
  )
}
