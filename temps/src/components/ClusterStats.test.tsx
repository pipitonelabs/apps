// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Stat, StatId } from '@/lib/stats'
import { ALERTMANAGER_URL, ClusterStats } from './ClusterStats'

const s = (id: StatId, value: string | null, result: number | null, tone: Stat['tone'] = 'good'): Stat => ({ id, value, result, tone })

const wrap = (stats: Partial<Record<StatId, Stat>>) => (
  <TooltipProvider>
    <ClusterStats stats={stats} />
  </TooltipProvider>
)

it('renders versions and usage', () => {
  render(
    wrap({
      talos_version: s('talos_version', '1.14.5', 1, 'neutral'),
      cluster_cpu_usage: s('cluster_cpu_usage', '13.5%', 13.5),
    }),
  )
  expect(screen.getByText('1.14.5')).toBeTruthy()
  expect(screen.getByText('13.5%')).toBeTruthy()
})

it('links the alerts tile to Alertmanager and flags firing alerts', () => {
  render(wrap({ cluster_alert_count: s('cluster_alert_count', '2', 2, 'bad') }))
  const link = screen.getByRole('link', { name: /alerts: 2/i })
  expect(link.getAttribute('href')).toBe(ALERTMANAGER_URL)
  expect(screen.getByText(/firing/)).toBeTruthy()
})

it('shows all clear with no alerts', () => {
  render(wrap({ cluster_alert_count: s('cluster_alert_count', '0', 0) }))
  expect(screen.getByText(/all clear/)).toBeTruthy()
})

it('shows open PRs as the last tile, split by author', () => {
  render(
    <TooltipProvider>
      <ClusterStats stats={{}} prs={{ total: 5, mine: 2, bots: 3, others: 0 }} />
    </TooltipProvider>,
  )
  const links = screen.getAllByRole('link')
  expect(links.at(-1)?.getAttribute('aria-label')).toMatch(/open prs: 5/i)
  expect(links.at(-2)?.getAttribute('aria-label')).toMatch(/^alerts/i)
  expect(screen.getByText('2 yours · 3 Renovate')).toBeTruthy()
})
