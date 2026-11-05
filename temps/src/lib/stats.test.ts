import { afterEach, expect, it, vi } from 'vitest'
import { fetchStats, parseBadge } from './stats'

afterEach(() => vi.unstubAllGlobals())

it('maps kromgo colors to tones', () => {
  expect(parseBadge('cluster_cpu_usage', { value: '13.5%', color: 'green', result: 13.5 })).toEqual({
    id: 'cluster_cpu_usage',
    value: '13.5%',
    result: 13.5,
    tone: 'good',
  })
  expect(parseBadge('cluster_alert_count', { value: '2', color: 'red', result: 2 }).tone).toBe('bad')
  expect(parseBadge('flux_version', { value: '2.10.0', result: 1 }).tone).toBe('neutral')
})

it('treats "no data" as missing', () => {
  expect(parseBadge('cluster_cpu_usage', { value: 'no data' })).toEqual({
    id: 'cluster_cpu_usage',
    value: null,
    result: null,
    tone: 'neutral',
  })
})

it('keeps the strip when only some badges fail', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.endsWith('cluster_pod_count')
        ? new Response('', { status: 502 })
        : new Response(JSON.stringify({ value: '1', color: 'green', result: 1 })),
    ),
  )
  const s = await fetchStats()
  expect(s.cluster_pod_count.value).toBeNull()
  expect(s.cluster_node_count.value).toBe('1')
})

it('fails when every badge fails', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 502 })))
  await expect(fetchStats()).rejects.toThrow(/HTTP 502/)
})
