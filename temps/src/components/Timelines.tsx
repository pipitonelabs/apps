import { useEffect, useState } from 'react'
import { usePoll } from '@/hooks/usePoll'
import { METRICS, type NodeName } from '@/lib/nodes'
import { DEFAULT_RANGE, fetchSeries, type RangeKey } from '@/lib/series'
import { RangePicker } from './RangePicker'
import { TempChart } from './TempChart'

const CHART_MS = 30_000

export function Timelines({ onLastSeen }: { onLastSeen: (s: Partial<Record<NodeName, number | null>>) => void }) {
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE)
  const series = usePoll(
    () => Promise.all(METRICS.map(({ key }) => fetchSeries(key, range))),
    CHART_MS,
    [range],
  )

  const cpuLastSeen = series.data?.[0].lastSeen
  useEffect(() => {
    if (cpuLastSeen) onLastSeen(cpuLastSeen)
  }, [cpuLastSeen, onLastSeen])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold tracking-[0.25em] uppercase">Timeline</h2>
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
        <div className="py-16 text-center text-xs tracking-[0.3em] text-muted-foreground uppercase">loading history…</div>
      )}
    </section>
  )
}
