import { afterEach, expect, it, vi } from 'vitest'
import { clock, fetchStreams, parseJellyfin, parsePlex } from './streams'

afterEach(() => vi.unstubAllGlobals())

it('parses a Tautulli episode session', () => {
  const [s] = parsePlex({
    response: {
      data: {
        sessions: [
          {
            session_key: '12',
            friendly_name: 'Joe',
            media_type: 'episode',
            title: 'Ozymandias',
            grandparent_title: 'Breaking Bad',
            parent_media_index: '5',
            media_index: '14',
            player: 'Living Room',
            product: 'Plex for Apple TV',
            state: 'paused',
            progress_percent: '41',
            view_offset: '1234000',
            duration: '2880000',
            transcode_decision: 'direct play',
            video_full_resolution: '1080p',
          },
        ],
      },
    },
  })
  expect(s).toMatchObject({
    id: 'plex-12',
    source: 'plex',
    user: 'Joe',
    title: 'Breaking Bad',
    subtitle: 'S5 · E14 · Ozymandias',
    device: 'Living Room · Plex for Apple TV',
    state: 'paused',
    progress: 41,
    transcode: false,
    quality: '1080p',
  })
})

it('parses a Jellyfin movie session and skips idle ones', () => {
  const streams = parseJellyfin([
    { Id: 'idle', UserName: 'Nobody' },
    {
      Id: 'a1',
      UserName: 'Deklin',
      Client: 'Jellyfin Web',
      DeviceName: 'Chrome',
      PlayMethod: 'Transcode',
      PlayState: { PositionTicks: 36_000_000_000, IsPaused: false },
      NowPlayingItem: { Name: 'Dune: Part Two', Type: 'Movie', ProductionYear: 2024, RunTimeTicks: 99_600_000_000 },
      TranscodingInfo: { Height: 720 },
    },
  ])
  expect(streams).toHaveLength(1)
  expect(streams[0]).toMatchObject({
    source: 'jellyfin',
    user: 'Deklin',
    title: 'Dune: Part Two',
    subtitle: '2024',
    state: 'playing',
    positionMs: 3_600_000,
    transcode: true,
    quality: '720p',
  })
  expect(streams[0].progress).toBeCloseTo(36.14, 1)
})

it('reads PlayMethod from PlayState (Jellyfin 12)', () => {
  const [s] = parseJellyfin([
    {
      UserName: 'admin',
      PlayState: { PositionTicks: 401_536_700, IsPaused: false, PlayMethod: 'Transcode' },
      NowPlayingItem: { Name: 'Die Hard', Type: 'Movie', ProductionYear: 1988, RunTimeTicks: 79_279_240_000, Height: 1080 },
    },
  ])
  expect(s).toMatchObject({ title: 'Die Hard', subtitle: '1988', transcode: true, quality: '1080p' })
})

it('keeps one source when the other fails', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.endsWith('/plex') ? new Response('', { status: 502 }) : new Response(JSON.stringify([])),
    ),
  )
  expect(await fetchStreams()).toEqual({ streams: [], failed: ['plex'] })
})

it('formats playback clocks', () => {
  expect(clock(2_052_000)).toBe('34:12')
  expect(clock(3_725_000)).toBe('1:02:05')
})
