import { expect, it } from 'vitest'
import { buildVms, vmNote } from './vms'

it('uses KubeVirt totals when available', () => {
  const v = buildVms(4, 4, 4)
  expect(v).toEqual({ running: 4, total: 4 })
  expect(vmNote(v)).toBe('4 of 4 running')
  expect(vmNote(buildVms(5, 3, 3))).toBe('3 of 5 running')
})

it('falls back to launcher pods without a total', () => {
  const v = buildVms(null, null, 4)
  expect(v).toEqual({ running: 4, total: null })
  expect(vmNote(v)).toBe('4 running')
})
