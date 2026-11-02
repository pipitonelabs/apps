export type PromVector = { metric: Record<string, string>; value: [number, string] }[]
export type PromMatrix = { metric: Record<string, string>; values: [number, string][] }[]

const BASE = (typeof process !== 'undefined' && process.env?.PROM_BASE) || ''

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  const res = await fetch(`${BASE}/api/v1/${path}?${qs}`)
  if (!res.ok) throw new Error(`prometheus ${path}: HTTP ${res.status}`)
  const body = await res.json()
  if (body.status !== 'success') throw new Error(`prometheus ${path}: ${body.error ?? body.status}`)
  return body.data.result as T
}

export const promQuery = (q: string) => get<PromVector>('query', { query: q })

export const promRange = (q: string, start: number, end: number, step: number) =>
  get<PromMatrix>('query_range', { query: q, start, end, step })
