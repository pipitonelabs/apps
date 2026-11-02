// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { NodeLive } from '@/lib/live'
import { NodeCard } from './NodeCard'

const node = (cpu: number | null, online = true): NodeLive => ({
  node: 'w2',
  online,
  lastSeen: null,
  values: { cpu, nvme0: 30, nvme1: 30, mem: 'no-sensor' },
})

const wrap = (n: NodeLive) => (
  <TooltipProvider>
    <NodeCard live={n} />
  </TooltipProvider>
)

it('renders a reading that returns after being missing', () => {
  const { rerender } = render(wrap(node(null)))
  expect(() => rerender(wrap(node(45.3)))).not.toThrow()
  expect(screen.getByText('45.3')).toBeTruthy()
})

it('shows last-seen time for an offline node', () => {
  const off = { ...node(null, false), lastSeen: Date.parse('2026-11-02T22:43:00Z') }
  render(wrap(off))
  expect(screen.getByText(/last seen 05:43 PM/i)).toBeTruthy()
})
