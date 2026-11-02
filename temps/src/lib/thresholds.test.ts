import { expect, it } from 'vitest'
import { tempState } from './thresholds'

it.each([
  ['cpu', 69.9, 'normal'],
  ['cpu', 70, 'warm'],
  ['cpu', 85, 'hot'],
  ['nvme0', 50, 'warm'],
  ['nvme1', 65, 'hot'],
  ['mem', 49, 'normal'],
  ['mem', 70, 'hot'],
  ['cpu', null, 'none'],
  ['mem', 'no-sensor', 'none'],
] as const)('tempState(%s, %s) = %s', (metric, v, want) => {
  expect(tempState(metric, v)).toBe(want)
})
