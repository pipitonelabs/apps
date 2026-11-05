import { Badge } from '@/components/ui/badge'
import { ClusterStats } from '@/components/ClusterStats'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LiveGrid } from '@/components/LiveGrid'
import { Timelines } from '@/components/Timelines'
import { usePoll } from '@/hooks/usePoll'
import { HealthTiles } from '@/components/HealthPanel'
import { NowStreaming } from '@/components/NowStreaming'
import { fetchStreams } from '@/lib/streams'
import { fetchGatus } from '@/lib/gatus'
import { fetchHealth } from '@/lib/health'
import { fetchLive, hottestCpu } from '@/lib/live'
import { tempState } from '@/lib/thresholds'
import { cn } from '@/lib/utils'
import { demoGatus, demoHealth, demoPrs, demoStats, demoStreams } from '@/lib/demo'
import { fetchOpenPrs } from '@/lib/github'
import { fetchStats } from '@/lib/stats'

const LIVE_MS = 10_000
const STATS_MS = 30_000
const STREAMS_MS = 15_000
// GitHub's unauthenticated search API allows 10 requests a minute.
const GITHUB_MS = 120_000
const WRAP = 'mx-auto w-full max-w-[1800px] px-[max(16px,env(safe-area-inset-left))] md:px-10'

const etClock = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit' })

export default function App() {
  const live = usePoll(fetchLive, LIVE_MS)
  const stats = usePoll(fetchStats, STATS_MS)
  const prs = usePoll(fetchOpenPrs, GITHUB_MS)
  const healthPoll = usePoll(fetchHealth, STATS_MS)
  const gatusPoll = usePoll(fetchGatus, STATS_MS)
  const health = demoHealth(healthPoll.data)
  const gatus = demoGatus(gatusPoll.data)
  const showHealth = !!(health || gatus)
  const streamsPoll = usePoll(fetchStreams, STREAMS_MS)
  const streams = demoStreams(streamsPoll.data)
  const playing = streams?.streams.filter((s) => s.state !== 'paused').length ?? 0
  const statsData = demoStats(stats.data)
  const hottest = live.data ? hottestCpu(live.data) : null
  const hotState = hottest ? tempState('cpu', hottest.temp) : 'none'

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className={`${WRAP} flex items-center justify-between gap-4 py-4 sm:py-5`}>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-medium tracking-tight">Cluster Stats</h1>
            <span className="hidden text-sm text-muted-foreground sm:inline">pipitonelabs k8s</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {(live.stale || stats.stale || healthPoll.stale || gatusPoll.stale) && <Badge variant="destructive">Data stale</Badge>}
            <span className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-foreground">
              <span className="pulse-dot size-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
            <span className="hidden tabular-nums sm:inline">{live.updatedAt ? `${etClock(live.updatedAt)} ET` : 'Connecting…'}</span>
          </div>
        </div>
      </header>

      <main className={`${WRAP} flex flex-col gap-10 py-6 sm:gap-12 sm:py-8`}>
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-medium">Cluster</h2>
          {statsData ? (
            <ClusterStats stats={statsData} prs={demoPrs(prs.data)} />
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {stats.error ? 'kromgo unreachable — retrying' : 'Loading…'}
            </div>
          )}
        </section>
        {showHealth && (
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-medium">Health</h2>
            <HealthTiles health={health} gatus={gatus} />
          </section>
        )}
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-xl font-medium">Now streaming</h2>
            {streams && streams.streams.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {playing} playing{streams.streams.length > playing ? ` · ${streams.streams.length - playing} paused` : ''}
              </span>
            )}
          </div>
          {streams ? (
            <NowStreaming data={streams} />
          ) : (
            <div className="rounded-lg bg-card px-5 py-6 text-sm text-muted-foreground ring-1 ring-border">
              {streamsPoll.error ? 'Plex and Jellyfin unreachable — retrying' : 'Loading…'}
            </div>
          )}
        </section>
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-xl font-medium">Node temperatures</h2>
            {hottest && (
              <span className="text-sm text-muted-foreground">
                hottest CPU{' '}
                <span
                  className={cn(
                    'tabular-nums',
                    hotState === 'hot' ? 'text-state-hot' : hotState === 'warm' ? 'text-state-warm' : 'text-foreground',
                  )}
                >
                  {hottest.temp.toFixed(1)} °C
                </span>{' '}
                on {hottest.node}
              </span>
            )}
          </div>
          {live.data ? (
            <LiveGrid nodes={live.data} />
          ) : (
            <div className="py-20 text-center text-sm text-muted-foreground">
              {live.error ? 'Prometheus unreachable — retrying' : 'Loading…'}
            </div>
          )}
        </section>
        <Timelines />
      </main>
    </TooltipProvider>
  )
}
