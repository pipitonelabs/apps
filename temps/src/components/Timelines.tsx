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
          <h2 className="text-xl font-medium">History</h2>
          {series.stale && <Badge variant="destructive">History stale</Badge>}
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
        <div className="py-16 text-center text-sm text-muted-foreground">
          {series.error ? 'History unavailable — retrying' : 'Loading history…'}
        </div>
      )}
    </section>
  )
}
