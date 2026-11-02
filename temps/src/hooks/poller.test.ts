import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPoller, type PollState } from './poller'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('keeps last good data and flags stale on failure, then recovers', async () => {
  const results: Array<() => Promise<number>> = [
    () => Promise.resolve(1),
    () => Promise.reject(new Error('down')),
    () => Promise.resolve(3),
  ]
  let call = 0
  const states: PollState<number>[] = []
  const stop = createPoller(() => results[call++](), 1000, (s) => states.push(s))

  await vi.advanceTimersByTimeAsync(0)
  expect(states.at(-1)).toMatchObject({ data: 1, stale: false })

  await vi.advanceTimersByTimeAsync(1000)
  expect(states.at(-1)).toMatchObject({ data: 1, stale: true })

  await vi.advanceTimersByTimeAsync(1000)
  expect(states.at(-1)).toMatchObject({ data: 3, stale: false, error: undefined })
  stop()
})
