// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { cleanup } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { backupReading, BACKUPS_URL, cephReading, FLUX_URL, fluxReading, type Health } from '@/lib/health'
import { HealthTiles } from './HealthPanel'
import type { Gatus } from '@/lib/gatus'

const pgs = { total: 81, clean: 81, degraded: 0, undersized: 0, recovering: 0 }
const idle = { names: [], upgrading: [], total: 12 }
const ceph = (o: Partial<Health['ceph']> = {}): Health['ceph'] => ({ status: 0, osdsUp: 4, osds: 4, pgs, rolling: idle, ...o })

it('reads ceph states', () => {
  expect(cephReading(ceph())).toEqual({ value: 'Healthy', tone: 'good', note: '4/4 OSDs up · 81 PGs clean' })
  expect(cephReading(ceph({ osdsUp: 3 })).tone).toBe('warn')
  expect(cephReading(ceph({ status: 1 }))).toEqual({ value: 'Warning', tone: 'warn', note: 'HEALTH_WARN · 4/4 OSDs up · 81 PGs clean' })
  expect(cephReading(ceph({ status: 2 }))).toEqual({ value: 'Error', tone: 'bad', note: 'HEALTH_ERR · 4/4 OSDs up · 81 PGs clean' })
  // PGs out of place with every daemon up: recovering when Ceph is working on it, degraded when it is not
  expect(cephReading(ceph({ status: 1, pgs: { ...pgs, clean: 58, degraded: 23, recovering: 23 } }))).toEqual({
    value: 'Recovering',
    tone: 'warn',
    note: '23 PGs recovering · 4/4 OSDs up',
  })
  expect(cephReading(ceph({ status: 1, osdsUp: 3, pgs: { ...pgs, clean: 69, degraded: 12 } }))).toEqual({
    value: 'Degraded',
    tone: 'warn',
    note: 'HEALTH_WARN · 12 PGs degraded · 3/4 OSDs up',
  })
  expect(cephReading(ceph({ status: 2, pgs: { ...pgs, degraded: 12, recovering: 12 } })).value).toBe('Error')
  // Daemons down with no spec change (node reboot) restart; a recent spec change is a rollout
  const rebooting = { names: ['rook-ceph-mon-h', 'rook-ceph-osd-0'], upgrading: [], total: 12 }
  expect(cephReading(ceph({ status: 1, osdsUp: 3, pgs: { ...pgs, clean: 17, degraded: 63, undersized: 64 }, rolling: rebooting }))).toEqual({
    value: 'Restarting',
    tone: 'warn',
    note: 'mon h, osd 0 restarting · 3/4 OSDs up · 63 PGs degraded',
  })
  const upgrade = { names: ['rook-ceph-mon-c'], upgrading: ['rook-ceph-mgr-a', 'rook-ceph-mon-c'], total: 12 }
  expect(cephReading(ceph({ status: 1, osdsUp: 3, rolling: upgrade }))).toEqual({
    value: 'Upgrading',
    tone: 'warn',
    note: 'mon c upgrading · 3/4 OSDs up · 81 PGs clean',
  })
  expect(cephReading(ceph({ status: 2, rolling: upgrade })).value).toBe('Error')
  // Rolling with Ceph metrics missing
  const gone = { status: null, osdsUp: null, osds: null, pgs: { total: null, clean: null, degraded: null, undersized: null, recovering: null } }
  const three = ['rook-ceph-mds-ceph-filesystem-b', 'rook-ceph-mgr-a', 'rook-ceph-osd-0']
  expect(cephReading(ceph({ ...gone, rolling: { names: three, upgrading: three, total: 12 } }))).toEqual({
    value: 'Upgrading',
    tone: 'warn',
    note: '3 of 12 daemons upgrading',
  })
  expect(cephReading(ceph({ ...gone, rolling: { names: three, upgrading: [], total: 12 } }))).toEqual({
    value: 'Restarting',
    tone: 'warn',
    note: '3 of 12 daemons restarting',
  })
  // No data at all, or Ceph gone with nothing rolling
  expect(cephReading(ceph({ ...gone, rolling: null }))).toEqual({ value: null, tone: 'neutral', note: '' })
  expect(cephReading(ceph(gone))).toEqual({ value: null, tone: 'neutral', note: '' })
})

it('reads backups and flux states', () => {
  expect(backupReading({ oldestAgeSec: 2670, apps: 26, outOfSync: 0 })).toEqual({ value: '44m ago', tone: 'good', note: 'oldest of 26 apps' })
  expect(backupReading({ oldestAgeSec: 2670, apps: 26, outOfSync: 2 }).tone).toBe('bad')
  expect(fluxReading({ total: 302, syncing: 0, failing: 0, suspended: 0 })).toEqual({ value: 'All synced', tone: 'good', note: '302 resources' })
  expect(fluxReading({ total: 302, syncing: 5, failing: 3, suspended: 1 })).toEqual({ value: '3 failing', tone: 'bad', note: '302 resources · 1 suspended' })
  expect(fluxReading({ total: 302, syncing: 55, failing: 0, suspended: 0 })).toEqual({ value: 'Syncing', tone: 'warn', note: '55 updating · 302 resources' })
})

afterEach(cleanup)

const health = {
  ceph: ceph(),
  backups: { oldestAgeSec: 2670, apps: 26, outOfSync: 0 },
  flux: { total: 302, syncing: 0, failing: 0, suspended: 0 },
}
const gatus = (down: string[] = []): Gatus => ({
  up: 42 - down.length,
  total: 42,
  groups: [{ group: 'media', up: 11 - down.length, total: 11, down }],
  availability24h: 99.94,
})

it('links Flux to the Flux UI, Services to Gatus and backups to Grafana', () => {
  render(
    <TooltipProvider>
      <HealthTiles health={health} gatus={gatus()} />
    </TooltipProvider>,
  )
  const flux = screen.getByRole('link', { name: /flux sync: all synced/i })
  expect(flux.getAttribute('href')).toBe(FLUX_URL)
  expect(flux.getAttribute('target')).toBe('_blank')
  expect(screen.getByRole('link', { name: /services: 42\/42 up/i }).getAttribute('href')).toBe('https://status.pipitonelabs.com')
  expect(screen.getByRole('link', { name: /last backup/i }).getAttribute('href')).toBe(BACKUPS_URL)
})

it('flags failing checks', () => {
  render(
    <TooltipProvider>
      <HealthTiles health={health} gatus={gatus(['jellyfin'])} />
    </TooltipProvider>,
  )
  expect(screen.getByText('1 down')).toBeTruthy()
})
