import { expect, it } from 'vitest'
import { buildGatus, fmtMs } from './gatus'

const ep = (group: string, name: string, ok: 0 | 1) => ({ metric: { group, name }, value: [0, String(ok)] as [number, string] })
const v = (x: number) => [{ metric: {}, value: [0, String(x)] as [number, string] }]

it('groups endpoints and lists failures first', () => {
  const g = buildGatus({
    success: [ep('media', 'plex', 1), ep('media', 'jellyfin', 0), ep('default', 'blog', 1)],
    availability: v(99.94),
    avgDuration: v(0.161),
    slowest: [{ metric: { name: 'karma' }, value: [0, '0.75'] }],
    certDays: v(39.4),
  })
  expect(g.up).toBe(2)
  expect(g.total).toBe(3)
  expect(g.groups[0]).toEqual({ group: 'media', up: 1, total: 2, down: ['jellyfin'] })
  expect(g.avgResponseMs).toBeCloseTo(161)
  expect(g.slowest).toEqual({ name: 'karma', ms: 750 })
  expect(g.certDays).toBe(39.4)
})

it('copes with no data', () => {
  expect(buildGatus({})).toMatchObject({ up: 0, total: 0, groups: [], availability24h: null, slowest: null })
})

it('formats response times', () => {
  expect(fmtMs(161.2)).toBe('161ms')
  expect(fmtMs(1530)).toBe('1.5s')
})
