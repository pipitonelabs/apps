// Live playback sessions from Plex (via Tautulli) and Jellyfin, through nginx paths that add the API keys server-side.

export type Source = 'plex' | 'jellyfin'

export interface Stream {
  id: string
  source: Source
  user: string
  /** Show name, movie title, or track. */
  title: string
  /** "S2 · E5 · Episode name", a movie's year, or empty. */
  subtitle: string
  device: string
  state: 'playing' | 'paused' | 'buffering'
  /** 0–100, or null when unknown. */
  progress: number | null
  positionMs: number | null
  durationMs: number | null
  transcode: boolean
  quality: string
}

export interface Streams {
  streams: Stream[]
  /** Sources that could not be reached this poll. */
  failed: Source[]
}

const num = (x: unknown): number | null => {
  const n = typeof x === 'string' ? Number(x) : typeof x === 'number' ? x : NaN
  return Number.isFinite(n) ? n : null
}

const episode = (season: unknown, ep: unknown, name: string) =>
  [num(season) !== null && `S${num(season)}`, num(ep) !== null && `E${num(ep)}`, name].filter(Boolean).join(' · ')

// --- Plex, via Tautulli's get_activity ---

interface TautulliSession {
  session_key?: string
  friendly_name?: string
  user?: string
  media_type?: string
  title?: string
  grandparent_title?: string
  parent_media_index?: string
  media_index?: string
  year?: string
  player?: string
  product?: string
  state?: string
  progress_percent?: string
  view_offset?: string
  duration?: string
  transcode_decision?: string
  stream_video_full_resolution?: string
  video_full_resolution?: string
}

export function parsePlex(body: { response?: { data?: { sessions?: TautulliSession[] } } }): Stream[] {
  return (body.response?.data?.sessions ?? []).map((s, i) => {
    const isEpisode = s.media_type === 'episode'
    const isTrack = s.media_type === 'track'
    const state = s.state === 'paused' ? 'paused' : s.state === 'buffering' ? 'buffering' : 'playing'
    return {
      id: `plex-${s.session_key ?? i}`,
      source: 'plex',
      user: s.friendly_name || s.user || 'Unknown',
      title: (isEpisode || isTrack ? s.grandparent_title : s.title) || s.title || 'Unknown',
      subtitle: isEpisode ? episode(s.parent_media_index, s.media_index, s.title ?? '') : isTrack ? (s.title ?? '') : (s.year ?? ''),
      device: [s.player, s.product].filter(Boolean).join(' · '),
      state,
      progress: num(s.progress_percent),
      positionMs: num(s.view_offset),
      durationMs: num(s.duration),
      transcode: s.transcode_decision === 'transcode',
      quality: s.stream_video_full_resolution || s.video_full_resolution || '',
    }
  })
}

// --- Jellyfin, via /Sessions ---

interface JellyfinSession {
  Id?: string
  UserName?: string
  Client?: string
  DeviceName?: string
  PlayMethod?: string
  PlayState?: { PositionTicks?: number; IsPaused?: boolean }
  NowPlayingItem?: {
    Name?: string
    SeriesName?: string
    ParentIndexNumber?: number
    IndexNumber?: number
    ProductionYear?: number
    Type?: string
    RunTimeTicks?: number
    Height?: number
  }
  TranscodingInfo?: { Height?: number }
}

const TICKS_PER_MS = 10_000

export function parseJellyfin(body: JellyfinSession[]): Stream[] {
  return body
    .filter((s) => s.NowPlayingItem)
    .map((s, i) => {
      const item = s.NowPlayingItem!
      const isEpisode = item.Type === 'Episode'
      const pos = num(s.PlayState?.PositionTicks)
      const dur = num(item.RunTimeTicks)
      const height = s.TranscodingInfo?.Height ?? item.Height
      return {
        id: `jellyfin-${s.Id ?? i}`,
        source: 'jellyfin',
        user: s.UserName || 'Unknown',
        title: (isEpisode ? item.SeriesName : item.Name) || item.Name || 'Unknown',
        subtitle: isEpisode ? episode(item.ParentIndexNumber, item.IndexNumber, item.Name ?? '') : String(item.ProductionYear ?? ''),
        device: [s.DeviceName, s.Client].filter(Boolean).join(' · '),
        state: s.PlayState?.IsPaused ? 'paused' : 'playing',
        progress: pos !== null && dur ? Math.min(100, (pos / dur) * 100) : null,
        positionMs: pos === null ? null : pos / TICKS_PER_MS,
        durationMs: dur === null ? null : dur / TICKS_PER_MS,
        transcode: s.PlayMethod === 'Transcode',
        quality: height ? `${height}p` : '',
      }
    })
}

const BASE = (typeof process !== 'undefined' && process.env?.STREAMS_BASE) || ''

async function getJson(source: Source) {
  const res = await fetch(`${BASE}/streams/${source}`)
  if (!res.ok) throw new Error(`${source}: HTTP ${res.status}`)
  return res.json()
}

export async function fetchStreams(): Promise<Streams> {
  const [plex, jellyfin] = await Promise.allSettled([getJson('plex').then(parsePlex), getJson('jellyfin').then(parseJellyfin)])
  if (plex.status === 'rejected' && jellyfin.status === 'rejected') throw plex.reason
  const failed: Source[] = []
  const streams: Stream[] = []
  for (const [source, r] of [['plex', plex], ['jellyfin', jellyfin]] as const) {
    if (r.status === 'fulfilled') streams.push(...r.value)
    else failed.push(source)
  }
  // Playing before paused, then by user.
  streams.sort((a, b) => Number(a.state === 'paused') - Number(b.state === 'paused') || a.user.localeCompare(b.user))
  return { streams, failed }
}

/** "1:02:05" or "34:12". */
export function clock(ms: number): string {
  const t = Math.floor(ms / 1000)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = String(t % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
