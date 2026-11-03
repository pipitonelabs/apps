import { describe, expect, it } from 'vitest'
import { visibleNodes } from './nodes'

const names = (xs: { name: string }[]) => xs.map((n) => n.name)

describe('visibleNodes', () => {
  it('shows every node for "all" on CPU/NVMe', () => {
    expect(names(visibleNodes('cpu', 'all'))).toEqual(['m0', 'm1', 'm2', 'w2'])
  })
  it('omits w2 from memory when showing all nodes (no DIMM sensor)', () => {
    expect(names(visibleNodes('mem', 'all'))).toEqual(['m0', 'm1', 'm2'])
  })
  it('shows only the selected node', () => {
    expect(names(visibleNodes('nvme0', 'm1'))).toEqual(['m1'])
  })
  it('returns no nodes for w2 memory, which has no sensor', () => {
    expect(visibleNodes('mem', 'w2')).toEqual([])
  })
})
