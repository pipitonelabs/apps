// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'

afterEach(cleanup)
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Stat, StatId } from '@/lib/stats'
import { ALERTMANAGER_URL, ClusterStats } from './ClusterStats'
import { TileSizeProvider, TileSizeSwitcher } from './TileSizeSwitcher'

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

it('shows running VMs after Pods, linking to kubevirt-manager', () => {
  render(
    <TooltipProvider>
      <ClusterStats stats={{}} vms={{ running: 4, total: 4 }} />
    </TooltipProvider>,
  )
  const vm = screen.getByRole('link', { name: /vms: 4 of 4 running/i })
  expect(vm.getAttribute('href')).toBe('https://kubevirt-manager.pipitonelabs.com')
  expect(screen.getByText('4 of 4 running')).toBeTruthy()
  const labels = [...document.querySelectorAll('section > *')].map((el) => el.textContent ?? '')
  expect(labels.findIndex((t) => t.startsWith('VMs'))).toBe(labels.findIndex((t) => t.startsWith('Pods')) + 1)
})

it('switches tile size from the switcher and persists it', () => {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
  })
  const { container } = render(
    <TooltipProvider>
      <TileSizeProvider>
        <TileSizeSwitcher />
        <ClusterStats stats={{ cluster_pod_count: s('cluster_pod_count', '100', 100) }} />
      </TileSizeProvider>
    </TooltipProvider>,
  )
  const tile = () => container.querySelector('.bg-card')!
  expect(tile().className).toContain('min-h-32')
  fireEvent.click(screen.getByRole('radio', { name: 'Dense tiles' }))
  expect(tile().className).toContain('min-h-20')
  expect(store.get('clusterstats.tileSize')).toBe('dense')
  fireEvent.click(screen.getByRole('radio', { name: 'Dense tiles' }))
  expect(tile().className).toContain('min-h-20')
})
