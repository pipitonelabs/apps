import { expect, it } from 'vitest'
import { buildGatus } from './gatus'

const ep = (group: string, name: string, ok: 0 | 1) => ({ metric: { group, name }, value: [0, String(ok)] as [number, string] })
const v = (x: number) => [{ metric: {}, value: [0, String(x)] as [number, string] }]

it('groups endpoints and lists failures first', () => {
  const g = buildGatus({
    success: [ep('media', 'plex', 1), ep('media', 'jellyfin', 0), ep('default', 'blog', 1)],
    availability: v(99.94),
  })
  expect(g.up).toBe(2)
  expect(g.total).toBe(3)
  expect(g.groups[0]).toEqual({ group: 'media', up: 1, total: 2, down: ['jellyfin'] })
})

it('copes with no data', () => {
  expect(buildGatus({})).toMatchObject({ up: 0, total: 0, groups: [], availability24h: null })
})

