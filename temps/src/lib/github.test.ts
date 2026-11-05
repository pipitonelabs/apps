import { expect, it } from 'vitest'
import { countPrs } from './github'

const pr = (login: string) => ({ user: { login } })

it('splits open PRs into mine, bots and others', () => {
  expect(countPrs({ total_count: 4, items: [pr('pipitonelabs'), pr('renovate[bot]'), pr('renovate[bot]'), pr('someone')] })).toEqual({
    total: 4,
    mine: 1,
    bots: 2,
    others: 1,
  })
})

it('handles no open PRs', () => {
  expect(countPrs({ total_count: 0, items: [] })).toEqual({ total: 0, mine: 0, bots: 0, others: 0 })
})

it('links to the GitOps repo pulls page only', async () => {
  const { PULLS_URL } = await import('./github')
  expect(PULLS_URL).toBe('https://github.com/pipitonelabs/k8s-gitops/pulls')
})
