import { expect, it } from 'vitest'
import { buildHealth, humanAge } from './health'

const v = (x: number | string) => [{ metric: {}, value: [0, String(x)] as [number, string] }]

it('builds health from query results', () => {
  expect(
    buildHealth({
      cephStatus: v(1),
      osdsUp: v(3),
      osds: v(4),
      pgTotal: v(81),
      pgClean: v(80),
      pgDegraded: v(0),
      pgUndersized: v(1),
      pgRecovering: v(1),
      cephDaemons: v(12),
      cephRolling: [{ metric: { deployment: 'rook-ceph-mon-c' }, value: [0, '1'] as [number, string] }],
      cephUpgrading: [
        { metric: { deployment: 'rook-ceph-mon-c' }, value: [0, '1'] as [number, string] },
        { metric: { deployment: 'rook-ceph-mgr-a' }, value: [0, '1'] as [number, string] },
      ],
      oldestBackupAge: v(2670.19),
      backupApps: v(26),
      outOfSync: v(0),
      fluxTotal: v(302),
      fluxSyncing: v(5),
      fluxFailing: v(2),
      fluxSuspended: v(0),
    }),
  ).toEqual({
    ceph: {
      status: 1,
      osdsUp: 3,
      osds: 4,
      pgs: { total: 81, clean: 80, degraded: 0, undersized: 1, recovering: 1 },
      rolling: { names: ['rook-ceph-mon-c'], upgrading: ['rook-ceph-mgr-a', 'rook-ceph-mon-c'], total: 12 },
    },
    backups: { oldestAgeSec: 2670.19, apps: 26, outOfSync: 0 },
    flux: { total: 302, syncing: 5, failing: 2, suspended: 0 },
  })
})

it('treats missing or unexpected values as no data', () => {
  const h = buildHealth({ cephStatus: v(7), oldestBackupAge: [] })
  expect(h.ceph.status).toBeNull()
  expect(h.ceph.rolling).toBeNull()
  expect(h.backups.oldestAgeSec).toBeNull()
  expect(h.flux.total).toBeNull()
})

it('formats ages', () => {
  expect(humanAge(2670)).toBe('44m')
  expect(humanAge(3 * 3600 + 5 * 60)).toBe('3h 5m')
  expect(humanAge(7200)).toBe('2h')
  expect(humanAge(2 * 86400 + 4 * 3600)).toBe('2d 4h')
})
