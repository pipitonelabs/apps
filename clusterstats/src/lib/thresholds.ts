import type { Reading } from './live'
import type { Metric } from './nodes'

export type TempState = 'normal' | 'warm' | 'hot' | 'none'

export const THRESHOLDS: Record<Metric, { warm: number; hot: number }> = {
  cpu: { warm: 70, hot: 85 },
  nvme0: { warm: 50, hot: 65 },
  nvme1: { warm: 50, hot: 65 },
  mem: { warm: 50, hot: 70 },
}

export function tempState(metric: Metric, v: Reading): TempState {
  if (typeof v !== 'number') return 'none'
  const t = THRESHOLDS[metric]
  return v >= t.hot ? 'hot' : v >= t.warm ? 'warm' : 'normal'
}
