// Open pull requests on the GitOps repo, from GitHub's unauthenticated search API.
// That API allows 10 requests a minute per IP, so poll no faster than once a minute.

export const GITHUB_OWNER = 'pipitonelabs'
export const GITHUB_REPO = `${GITHUB_OWNER}/k8s-gitops`
export const PULLS_URL = `https://github.com/${GITHUB_REPO}/pulls`
const SEARCH_URL = `https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${GITHUB_REPO} is:pr is:open`)}&per_page=100`

export interface OpenPrs {
  total: number
  /** Opened by the repo owner. */
  mine: number
  /** Opened by bots such as Renovate. */
  bots: number
  others: number
}

export function countPrs(body: { total_count: number; items: { user: { login: string } }[] }): OpenPrs {
  let mine = 0
  let bots = 0
  for (const { user } of body.items) {
    if (user.login === GITHUB_OWNER) mine++
    else if (user.login.endsWith('[bot]')) bots++
  }
  // total_count can exceed the 100 items returned; anything beyond the page counts as "other".
  return { total: body.total_count, mine, bots, others: body.total_count - mine - bots }
}

export async function fetchOpenPrs(): Promise<OpenPrs> {
  const res = await fetch(SEARCH_URL, { headers: { Accept: 'application/vnd.github+json' } })
  if (!res.ok) throw new Error(`github search: HTTP ${res.status}`)
  return countPrs(await res.json())
}
