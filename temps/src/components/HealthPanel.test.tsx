// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { cleanup } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { backupReading, cephReading, FLUX_URL, fluxReading } from '@/lib/health'
import { HealthTiles } from './HealthPanel'
import type { Gatus } from '@/lib/gatus'

it('reads ceph, backups and flux states', () => {
  expect(cephReading({ status: 0, osdsUp: 4, osds: 4 })).toEqual({ value: 'Healthy', tone: 'good', note: 'HEALTH_OK · 4/4 OSDs up' })
  expect(cephReading({ status: 0, osdsUp: 3, osds: 4 }).tone).toBe('warn')
  expect(backupReading({ oldestAgeSec: 2670, apps: 26, outOfSync: 0 })).toEqual({ value: '44m ago', tone: 'good', note: 'oldest of 26 apps' })
  expect(backupReading({ oldestAgeSec: 2670, apps: 26, outOfSync: 2 }).tone).toBe('bad')
  expect(fluxReading({ total: 302, failing: 0, suspended: 0 })).toEqual({ value: 'All synced', tone: 'good', note: '302 resources' })
  expect(fluxReading({ total: 302, failing: 3, suspended: 1 })).toEqual({ value: '3 failing', tone: 'bad', note: '302 resources · 1 suspended' })
})

afterEach(cleanup)

const health = {
  ceph: { status: 0 as const, osdsUp: 4, osds: 4 },
  backups: { oldestAgeSec: 2670, apps: 26, outOfSync: 0 },
  flux: { total: 302, failing: 0, suspended: 0 },
}
const gatus = (down: string[] = []): Gatus => ({
  up: 42 - down.length,
  total: 42,
  groups: [{ group: 'media', up: 11 - down.length, total: 11, down }],
  availability24h: 99.94,
  avgResponseMs: 161,
  slowest: { name: 'karma', ms: 754 },
  certDays: 39.4,
})

it('links Flux to the Flux UI and Services to Gatus', () => {
  render(
    <TooltipProvider>
      <HealthTiles health={health} gatus={gatus()} />
    </TooltipProvider>,
  )
  const flux = screen.getByRole('link', { name: /flux: all synced/i })
  expect(flux.getAttribute('href')).toBe(FLUX_URL)
  expect(flux.getAttribute('target')).toBe('_blank')
  expect(screen.getByRole('link', { name: /services: 42\/42 up/i }).getAttribute('href')).toBe('https://status.pipitonelabs.com')
})

it('flags failing checks', () => {
  render(
    <TooltipProvider>
      <HealthTiles health={health} gatus={gatus(['jellyfin'])} />
    </TooltipProvider>,
  )
  expect(screen.getByText('1 down')).toBeTruthy()
})
