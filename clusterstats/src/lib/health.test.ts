import { expect, it } from 'vitest'
import { buildHealth, humanAge } from './health'

const v = (x: number | string) => [{ metric: {}, value: [0, String(x)] as [number, string] }]

it('builds health from query results', () => {
  expect(
    buildHealth({
      cephStatus: v(1),
      osdsUp: v(3),
      osds: v(4),
      oldestBackupAge: v(2670.19),
      backupApps: v(26),
      outOfSync: v(0),
      fluxTotal: v(302),
      fluxSyncing: v(5),
      fluxFailing: v(2),
      fluxSuspended: v(0),
    }),
  ).toEqual({
    ceph: { status: 1, osdsUp: 3, osds: 4 },
    backups: { oldestAgeSec: 2670.19, apps: 26, outOfSync: 0 },
    flux: { total: 302, syncing: 5, failing: 2, suspended: 0 },
  })
})

it('treats missing or unexpected values as no data', () => {
  const h = buildHealth({ cephStatus: v(7), oldestBackupAge: [] })
  expect(h.ceph.status).toBeNull()
  expect(h.backups.oldestAgeSec).toBeNull()
  expect(h.flux.total).toBeNull()
})

it('formats ages', () => {
  expect(humanAge(2670)).toBe('44m')
  expect(humanAge(3 * 3600 + 5 * 60)).toBe('3h 5m')
  expect(humanAge(7200)).toBe('2h')
  expect(humanAge(2 * 86400 + 4 * 3600)).toBe('2d 4h')
})
