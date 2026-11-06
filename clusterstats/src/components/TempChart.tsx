import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { visibleNodes, type Metric, type NodeSelection } from '@/lib/nodes'
import { useScale } from './size'
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
  new Date(ms).toLocaleString(
    'en-US',
    span > 2 * 86400_000 ? { timeZone: TZ, month: 'short', day: 'numeric' } : { timeZone: TZ, hour: 'numeric', minute: '2-digit' },
  )
const fmtFull = (ms: number) =>
  new Date(ms).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET'

export function TempChart({ metric, selection, title, rows, start, end }: { metric: Metric; selection: NodeSelection; title: string; rows: ChartRow[]; start: number; end: number }) {
  const scale = useScale()
  const nodes = visibleNodes(metric, selection)
  const latest = (name: string) => {
    for (let i = rows.length - 1; i >= 0; i--) {
      const v = rows[i][name as keyof ChartRow]
      if (typeof v === 'number') return v
    }
    return null
  }
  return (
    <Card className="gap-4 rounded-lg border-0 px-3 py-5 ring-1 sm:p-6 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 sm:px-0">
        <span className="text-base font-medium">{title}</span>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:gap-5 sm:text-sm">
          {nodes.map((n) => (
            <span key={n.name} className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: `var(--color-${n.name})` }} />
              {n.name}
              <span className="text-foreground tabular-nums">{latest(n.name)?.toFixed(1) ?? '—'}°</span>
            </span>
          ))}
        </div>
      </div>
      <ChartContainer config={config} className="aspect-auto h-55 w-full sm:h-75">
        <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[start, end]}
            tickFormatter={fmtTick(end - start)}
            tickLine={false}
            axisLine={false}
            minTickGap={Math.round(56 * scale)}
          />
          <YAxis
            width={Math.round(36 * scale)}
            tickLine={false}
            axisLine={false}
            domain={[(min: number) => Math.floor(min - 3), (max: number) => Math.ceil(max + 3)]}
            tickFormatter={(v: number) => `${v}°`}
          />
          <ReferenceLine y={THRESHOLDS[metric].warm} stroke="var(--state-warm)" strokeOpacity={0.4} strokeDasharray="4 4" ifOverflow="hidden" />
          <ChartTooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.4 }}
            content={<ChartTooltipContent labelFormatter={(_, p) => fmtFull(Number(p?.[0]?.payload?.t))} />}
          />
          {nodes.map((n) => (
            <Line
              key={n.name}
              dataKey={n.name}
              type="monotone"
              stroke={`var(--color-${n.name})`}
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </Card>
  )
}
