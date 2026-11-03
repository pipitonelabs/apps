import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { usePoll } from '@/hooks/usePoll'
import { METRICS, visibleMetrics, type Metric, type NodeSelection } from '@/lib/nodes'
import { DEFAULT_RANGE, fetchSeries, type RangeKey } from '@/lib/series'
import { NodePicker } from './NodePicker'
import { RangePicker } from './RangePicker'
import { TempChart } from './TempChart'

const CHART_MS = 30_000
const idx = (k: Metric) => METRICS.findIndex((m) => m.key === k)

export function Timelines() {
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE)
  const [node, setNode] = useState<NodeSelection>('all')
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
        <div className="flex flex-wrap items-center gap-2">
          <NodePicker value={node} onChange={setNode} />
          <RangePicker value={range} onChange={setRange} />
        </div>
      </div>
      {series.data ? (
        visibleMetrics(node).map(({ key, label }) => (
          <TempChart
            key={key}
            metric={key}
            selection={node}
            title={label}
            rows={series.data![idx(key)].rows}
            start={series.data![idx(key)].start}
            end={series.data![idx(key)].end}
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
