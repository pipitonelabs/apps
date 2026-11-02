import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { eventsIn } from '@/lib/events'
import { NODES, type Metric } from '@/lib/nodes'
import type { ChartRow } from '@/lib/series'
import { THRESHOLDS } from '@/lib/thresholds'

const config: ChartConfig = {
  m0: { label: 'm0', color: 'var(--chart-1)' },
  m1: { label: 'm1', color: 'var(--chart-2)' },
  m2: { label: 'm2', color: 'var(--chart-3)' },
  w2: { label: 'w2', color: 'var(--chart-4)' },
}

const TZ = 'America/New_York'
const fmtTick = (span: number) => (ms: number) =>
  new Date(ms).toLocaleString('en-US', span > 2 * 86400_000
    ? { timeZone: TZ, month: 'short', day: 'numeric' }
    : { timeZone: TZ, hour: 'numeric', minute: '2-digit' })
const fmtFull = (ms: number) =>
  new Date(ms).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET'

export function TempChart({
  metric,
  title,
  rows,
  start,
  end,
}: {
  metric: Metric
  title: string
  rows: ChartRow[]
  start: number
  end: number
}) {
  const nodes = NODES.filter((n) => metric !== 'mem' || n.hasMemSensor)
  const events = eventsIn(start, end)
  const latest = (name: string) => {
    for (let i = rows.length - 1; i >= 0; i--) {
      const v = rows[i][name as keyof ChartRow]
      if (typeof v === 'number') return v
    }
    return null
  }
  return (
    <Card className="glow-edge rounded-2xl backdrop-blur-md">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-heading text-sm font-semibold tracking-[0.25em] uppercase">{title}</span>
        <div className="flex flex-wrap gap-4 text-[11px] tracking-[0.12em] uppercase">
          {nodes.map((n) => (
            <span key={n.name} className="flex items-center gap-2 text-muted-foreground">
              <span className="h-0.5 w-4 rounded-full" style={{ background: `var(--color-${n.name})`, boxShadow: `0 0 8px var(--color-${n.name})` }} />
              {n.name}
              <span className="text-foreground tabular-nums">{latest(n.name)?.toFixed(1) ?? '—'}°</span>
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
          <LineChart data={rows} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="var(--border)" />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[start, end]}
              tickFormatter={fmtTick(end - start)}
              tickLine={false}
              axisLine={false}
              minTickGap={48}
            />
            <YAxis
              width={40}
              tickLine={false}
              axisLine={false}
              domain={[(min: number) => Math.floor(min - 3), (max: number) => Math.ceil(max + 3)]}
              tickFormatter={(v: number) => `${v}°`}
            />
            <ReferenceLine y={THRESHOLDS[metric].warm} stroke="var(--state-warm)" strokeOpacity={0.35} strokeDasharray="4 4" ifOverflow="hidden" />
            {events.map((e, i) => (
              <ReferenceLine
                key={e.t}
                x={e.t}
                stroke="var(--muted-foreground)"
                strokeOpacity={0.6}
                strokeDasharray="3 5"
                label={{ value: String(i + 1), position: i % 2 ? 'insideTopRight' : 'insideTopLeft', fill: 'var(--primary)', fontSize: 10 }}
              />
            ))}
            <ChartTooltip
              cursor={{ stroke: 'var(--primary)', strokeOpacity: 0.4 }}
              content={<ChartTooltipContent labelFormatter={(_, p) => fmtFull(Number(p?.[0]?.payload?.t))} />}
            />
            {nodes.map((n) => (
              <Line
                key={n.name}
                dataKey={n.name}
                type="monotone"
                stroke={`var(--color-${n.name})`}
                strokeWidth={1.75}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
                style={{ filter: `drop-shadow(0 0 4px var(--color-${n.name}))` }}
              />
            ))}
          </LineChart>
        </ChartContainer>
        {events.length > 0 && (
          <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-1 px-2 text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
            {events.map((e, i) => (
              <li key={e.t}>
                <span className="text-primary">{i + 1}</span> {fmtFull(e.t).replace(/^\w+ \d+, /, '')} · {e.label}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
