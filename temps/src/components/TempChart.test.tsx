// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { TempChart } from './TempChart'

it('explains that w2 has no memory sensor instead of drawing an empty chart', () => {
  render(<TempChart metric="mem" selection="w2" title="Memory" rows={[]} start={0} end={1} />)
  expect(screen.getByText('No memory sensor on w2')).toBeTruthy()
})
