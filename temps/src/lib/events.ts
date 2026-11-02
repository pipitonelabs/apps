// Cooling changes from 2026-11-02. Times are UTC; "~" ones are approximate.
export const EVENTS: { t: string; label: string }[] = [
  { t: '2026-11-02T18:53:00Z', label: 'm1 blower out + repaste' },
  { t: '2026-11-02T19:15:00Z', label: 'w2 heatsinks, top fan out' },
  { t: '2026-11-02T21:06:00Z', label: 'w2 top off' },
  { t: '2026-11-02T21:20:00Z', label: 'm0 blower out + repaste (~)' },
  { t: '2026-11-02T21:50:00Z', label: 'm2 blower out + repaste (~)' },
]

export function eventsIn(startMs: number, endMs: number): { t: number; label: string }[] {
  return EVENTS.map((e) => ({ t: Date.parse(e.t), label: e.label })).filter((e) => e.t >= startMs && e.t <= endMs)
}
