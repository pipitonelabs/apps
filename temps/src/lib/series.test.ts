import { describe, expect, it } from 'vitest'
import { eventsIn } from './events'
import { lastSeen, stepFor, toChartRows } from './series'
import type { PromMatrix } from './prom'

describe('stepFor', () => {
  it('uses the 15s floor for 1h', () => expect(stepFor(3600)).toBe(15))
  it('keeps 14d at or under 400 points', () => {
    expect(stepFor(14 * 86400)).toBe(3024)
    expect((14 * 86400) / stepFor(14 * 86400)).toBeLessThanOrEqual(400)
  })
})

const start = 1000
const step = 60
const end = start + step * 5
const matrix: PromMatrix = [
  { metric: { instance: '192.168.10.10:9100' }, values: [0, 1, 2, 3, 4, 5].map((i) => [start + i * step, String(30 + i)]) },
  { metric: { instance: '192.168.10.15:9100' }, values: [0, 1, 2].map((i) => [start + i * step, String(50 + i)]) },
]

describe('toChartRows', () => {
  const rows = toChartRows(matrix, start, end, step)
  it('emits one row per step in ms', () => {
    expect(rows).toHaveLength(6)
    expect(rows[0].t).toBe(start * 1000)
  })
  it('has numbers while a node reports and null after it stops', () => {
    expect(rows[2].w2).toBe(52)
    expect(rows[3].w2).toBeNull()
    expect(rows[5].m0).toBe(35)
  })
  it('fills null for nodes absent from the matrix', () => expect(rows[0].m1).toBeNull())
})

describe('lastSeen', () => {
  it('returns the last sample time in ms', () => expect(lastSeen(matrix, 'w2')).toBe((start + 2 * step) * 1000))
  it('returns null for a node with no samples', () => expect(lastSeen(matrix, 'm1')).toBeNull())
})

describe('eventsIn', () => {
  it('returns all five Nov 2 cooling changes', () => {
    expect(eventsIn(Date.parse('2026-11-02T18:00:00Z'), Date.parse('2026-11-02T22:00:00Z'))).toHaveLength(5)
  })
  it('returns none for Nov 1', () => {
    expect(eventsIn(Date.parse('2026-11-01T00:00:00Z'), Date.parse('2026-11-01T23:59:59Z'))).toHaveLength(0)
  })
})
