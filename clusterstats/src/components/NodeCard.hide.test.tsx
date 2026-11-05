// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { NodeLive } from '@/lib/live'
import { NodeCard } from './NodeCard'

afterEach(cleanup)

const card = (node: 'm0' | 'w2', mem: NodeLive['values']['mem']) => (
  <TooltipProvider>
    <NodeCard live={{ node, online: true, lastSeen: null, values: { cpu: 40, nvme0: 30, nvme1: 30, mem } }} />
  </TooltipProvider>
)

it('does not render a Memory cell for a node without a memory sensor', () => {
  render(card('w2', 'no-sensor'))
  expect(screen.queryByText('Memory')).toBeNull()
  expect(screen.queryByText('No sensor')).toBeNull()
  expect(screen.getByText('NVMe 1')).toBeTruthy()
})

it('still renders Memory when the node has a sensor', () => {
  render(card('m0', 35))
  expect(screen.getByText('Memory')).toBeTruthy()
})
