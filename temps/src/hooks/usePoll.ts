import { useEffect, useState } from 'react'
import { createPoller, type PollState } from './poller'

export function usePoll<T>(fn: () => Promise<T>, ms: number, deps: unknown[] = []): PollState<T> {
  const [state, setState] = useState<PollState<T>>({ data: undefined, error: undefined, stale: false, updatedAt: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => createPoller(fn, ms, setState), [ms, ...deps])
  return state
}
