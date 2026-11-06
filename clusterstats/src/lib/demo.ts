import type { Gatus } from './gatus'
import type { OpenPrs } from './github'
import type { Health } from './health'
import type { Stat, StatId } from './stats'
import type { Streams } from './streams'

const params = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null

/** Dev server only: `?demo` fakes problems (alerts, a Ceph warning, failing checks) so those states can be previewed. */
export const DEMO = !!params?.has('demo')


export function demoStats(stats: Record<StatId, Stat> | undefined): Record<StatId, Stat> | undefined {
  if (!DEMO || !stats) return stats
  return { ...stats, cluster_alert_count: { id: 'cluster_alert_count', value: '3', result: 3, tone: 'bad' } }
}

export const demoPrs = (prs: OpenPrs | undefined): OpenPrs | undefined => (DEMO ? { total: 5, mine: 2, bots: 3, others: 0 } : prs)

export const demoHealth = (h: Health | undefined): Health | undefined =>
  DEMO && h ? { ...h, ceph: { ...h.ceph, status: 1, osdsUp: 3, osds: 4 } } : h

export function demoGatus(g: Gatus | undefined): Gatus | undefined {
  if (!DEMO || !g) return g
  const fail: Record<string, string> = { media: 'jellyfin', networking: 'echo-server' }
  const groups = g.groups
    .map((x) => (fail[x.group] ? { ...x, up: x.up - 1, down: [fail[x.group]] } : x))
    .sort((a, b) => b.down.length - a.down.length || a.group.localeCompare(b.group))
  return { ...g, up: g.up - 2, groups, availability24h: 98.71 }
}

export const demoStreams = (s: Streams | undefined): Streams | undefined =>
  DEMO
    ? {
        failed: [],
        streams: [
          {
            id: 'demo-1',
            source: 'plex',
            user: 'Joe',
            title: 'Severance',
            subtitle: 'S2 · E7 · Chikhai Bardo',
            device: 'Living Room · Plex for Apple TV',
            state: 'playing',
            progress: 41,
            positionMs: 1_234_000,
            durationMs: 3_010_000,
            transcode: false,
            quality: '4K',
          },
          {
            id: 'demo-2',
            source: 'jellyfin',
            user: 'Luca',
            title: 'Dune: Part Two',
            subtitle: '2024',
            device: 'iPad · Jellyfin iOS',
            state: 'playing',
            progress: 63,
            positionMs: 6_280_000,
            durationMs: 9_960_000,
            transcode: true,
            quality: '720p',
          },
          {
            id: 'demo-3',
            source: 'plex',
            user: 'Deklin',
            title: 'Bluey',
            subtitle: 'S3 · E12 · Housework',
            device: 'Kids Room · Plex for Roku',
            state: 'paused',
            progress: 22,
            positionMs: 92_000,
            durationMs: 420_000,
            transcode: false,
            quality: '1080p',
          },
        ],
      }
    : s
