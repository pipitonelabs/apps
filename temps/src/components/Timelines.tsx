import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { usePoll } from '@/hooks/usePoll'
import { METRICS } from '@/lib/nodes'
import { DEFAULT_RANGE, fetchSeries, type RangeKey } from '@/lib/series'
import { RangePicker } from './RangePicker'
import { TempChart } from './TempChart'

const CHART_MS = 30_000

export function Timelines() {
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE)
  const series = usePoll(
    () => Promise.all(METRICS.map(({ key }) => fetchSeries(key, range))),
    CHART_MS,
    [range],
  )

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-lg font-semibold tracking-[0.25em] uppercase">Timeline</h2>
          {series.stale && <Badge variant="destructive">history stale</Badge>}
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>
      {series.data ? (
        METRICS.map(({ key, label }, i) => (
          <TempChart
            key={key}
            metric={key}
            title={label}
            rows={series.data![i].rows}
            start={series.data![i].start}
            end={series.data![i].end}
          />
        ))
      ) : (
        <div className="py-16 text-center text-xs tracking-[0.3em] text-muted-foreground uppercase">
          {series.error ? 'history unavailable — retrying' : 'loading history…'}
        </div>
      )}
    </section>
  )
}
