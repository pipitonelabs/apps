import { Pause, Play } from '@phosphor-icons/react'
import { siJellyfin, siPlex, type SimpleIcon } from 'simple-icons'
import { clock, type Source, type Stream, type Streams } from '@/lib/streams'
import { cn } from '@/lib/utils'

const SOURCES: Record<Source, { name: string; icon: SimpleIcon }> = {
  plex: { name: 'Plex', icon: siPlex },
  jellyfin: { name: 'Jellyfin', icon: siJellyfin },
}

function SourceBadge({ source }: { source: Source }) {
  const { name, icon } = SOURCES[source]
  return (
    <span
      className="flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs"
      style={{ backgroundColor: `#${icon.hex}1f`, color: `#${icon.hex}` }}
    >
      <svg viewBox="0 0 24 24" className="size-3" fill="currentColor" aria-hidden>
        <path d={icon.path} />
      </svg>
      {name}
    </span>
  )
}

function StreamCard({ s }: { s: Stream }) {
  const paused = s.state === 'paused'
  const color = `#${SOURCES[s.source].icon.hex}`
  return (
    <article
      aria-label={`${s.user} watching ${s.title} on ${SOURCES[s.source].name}`}
      className={cn('flex flex-col gap-4 rounded-lg bg-card p-4 ring-1 ring-border sm:p-5', paused && 'opacity-75')}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium">{s.user}</span>
        <SourceBadge source={s.source} />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-lg leading-snug font-medium">{s.title}</span>
        <span className="truncate text-sm text-muted-foreground">{s.subtitle || ' '}</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="relative h-0.5 w-full rounded-full bg-foreground/10">
          {s.progress !== null && (
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
              style={{ width: `${s.progress}%`, backgroundColor: paused ? 'var(--muted-foreground)' : color }}
            />
          )}
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {paused ? <Pause weight="fill" className="size-3" /> : <Play weight="fill" className="size-3" style={{ color }} />}
            {paused ? 'Paused' : s.state === 'buffering' ? 'Buffering' : 'Playing'}
            {s.positionMs !== null && s.durationMs !== null && (
              <span className="tabular-nums">
                · {clock(s.positionMs)} / {clock(s.durationMs)}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {s.quality && <span>{s.quality}</span>}
            <span
              className={cn(
                'rounded-sm px-1.5 py-0.5',
                s.transcode ? 'bg-state-warm/15 text-state-warm' : 'bg-foreground/10 text-foreground/80',
              )}
            >
              {s.transcode ? 'Transcode' : 'Direct'}
            </span>
          </span>
        </div>
        {s.device && <span className="truncate text-xs text-muted-foreground">{s.device}</span>}
      </div>
    </article>
  )
}

export function NowStreaming({ data }: { data: Streams }) {
  return (
    <div className="flex flex-col gap-3">
      {data.streams.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.streams.map((s) => (
            <StreamCard key={s.id} s={s} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-card px-5 py-6 text-sm text-muted-foreground ring-1 ring-border">Nothing playing</div>
      )}
      {data.failed.length > 0 && (
        <span className="text-xs text-state-warm">
          {data.failed.map((f) => SOURCES[f].name).join(' and ')} unreachable — showing the rest
        </span>
      )}
    </div>
  )
}
