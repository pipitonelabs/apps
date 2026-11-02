export interface PollState<T> {
  data: T | undefined
  error: unknown
  stale: boolean
  updatedAt: number | null
}

/** Runs fn now and every `ms`; on failure keeps the last good data and marks it stale. Returns a stop function. */
export function createPoller<T>(fn: () => Promise<T>, ms: number, onState: (s: PollState<T>) => void): () => void {
  let state: PollState<T> = { data: undefined, error: undefined, stale: false, updatedAt: null }
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const tick = async () => {
    try {
      const data = await fn()
      state = { data, error: undefined, stale: false, updatedAt: Date.now() }
    } catch (error) {
      state = { ...state, error, stale: true }
    }
    if (stopped) return
    onState(state)
    timer = setTimeout(tick, ms)
  }
  timer = setTimeout(tick, 0)

  return () => {
    stopped = true
    clearTimeout(timer)
  }
}
