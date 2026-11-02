import { describe, expect, it } from 'vitest'
import { buildLive } from './live'
import type { PromVector } from './prom'
import type { Metric } from './nodes'

const s = (ip: string, v: number | string) => ({
  metric: { instance: `${ip}:9100` },
  value: [1762124400, String(v)] as [number, string],
})
const allUp: PromVector = ['10', '11', '12', '15'].map((x) => s(`192.168.10.${x}`, 1))

const full = (): Record<Metric, PromVector> => ({
  cpu: [s('192.168.10.10', 37), s('192.168.10.11', 35), s('192.168.10.12', 34), s('192.168.10.15', 49.5)],
  nvme0: [s('192.168.10.10', 30.85), s('192.168.10.11', 27.85), s('192.168.10.12', 27.85), s('192.168.10.15', 32.85)],
  nvme1: [s('192.168.10.10', 31.85), s('192.168.10.11', 30.85), s('192.168.10.12', 29.85), s('192.168.10.15', 24.85)],
  mem: [s('192.168.10.10', 35.75), s('192.168.10.11', 33.25), s('192.168.10.12', 32)],
})

describe('buildLive', () => {
  it('maps every node in m0,m1,m2,w2 order with its readings', () => {
    const live = buildLive(allUp, full())
    expect(live.map((n) => n.node)).toEqual(['m0', 'm1', 'm2', 'w2'])
    expect(live[0].values.cpu).toBe(37)
    expect(live[0].values.mem).toBe(35.75)
    expect(live[0].online).toBe(true)
  })

  it('marks a node absent from up as offline with all values null', () => {
    const live = buildLive(allUp.slice(0, 3), full())
    const w2 = live[3]
    expect(w2.online).toBe(false)
    expect(Object.values(w2.values)).toEqual([null, null, null, null])
  })

  it('marks a node whose up value is 0 as offline', () => {
    const up = [...allUp.slice(0, 3), s('192.168.10.15', 0)]
    expect(buildLive(up, full())[3].online).toBe(false)
  })

  it('reports a single missing sensor on an online node as null', () => {
    const m = full()
    m.nvme1 = m.nvme1.filter((x) => x.metric.instance !== '192.168.10.11:9100')
    const m1 = buildLive(allUp, m)[1]
    expect(m1.online).toBe(true)
    expect(m1.values.nvme1).toBeNull()
  })

  it('gives an offline node its last-seen time in ms, independent of chart range', () => {
    const seen: PromVector = [s('192.168.10.15', 1762122180)]
    const live = buildLive(allUp.slice(0, 3), full(), seen)
    expect(live[3].lastSeen).toBe(1762122180 * 1000)
    expect(live[0].lastSeen).toBeNull()
  })

  it('reports w2 memory as no-sensor when online', () => {
    expect(buildLive(allUp, full())[3].values.mem).toBe('no-sensor')
  })
})
