// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import type { Stream } from '@/lib/streams'
import { NowStreaming } from './NowStreaming'

afterEach(cleanup)

const stream: Stream = {
  id: 'plex-1',
  source: 'plex',
  user: 'Joe',
  title: 'Breaking Bad',
  subtitle: 'S5 · E14 · Ozymandias',
  device: 'Living Room · Plex for Apple TV',
  state: 'playing',
  progress: 41,
  positionMs: 1_234_000,
  durationMs: 2_880_000,
  transcode: true,
  quality: '1080p',
}

it('shows who is watching what, where', () => {
  render(<NowStreaming data={{ streams: [stream], failed: [] }} />)
  expect(screen.getByRole('article', { name: 'Joe watching Breaking Bad on Plex' })).toBeTruthy()
  expect(screen.getByText('S5 · E14 · Ozymandias')).toBeTruthy()
  expect(screen.getByText('Transcode')).toBeTruthy()
  expect(screen.getByText(/20:34 \/ 48:00/)).toBeTruthy()
})

it('shows an empty state and unreachable sources', () => {
  render(<NowStreaming data={{ streams: [], failed: ['jellyfin'] }} />)
  expect(screen.getByText('Nothing playing')).toBeTruthy()
  expect(screen.getByText(/Jellyfin unreachable/)).toBeTruthy()
})
