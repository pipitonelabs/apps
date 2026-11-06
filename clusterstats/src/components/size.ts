/** Page-wide size: scales the root font-size so every rem-based Tailwind class follows. */

import { createContext, useContext } from 'react'

/** Keys are the values already stored in localStorage, so earlier choices carry over. */
export const SIZES = {
  dense: { label: 'S', name: 'Small', rootPx: 13 },
  compact: { label: 'M', name: 'Medium', rootPx: 14 },
  snug: { label: 'L', name: 'Large', rootPx: 15 },
  default: { label: 'XL', name: 'Extra large', rootPx: 16 },
} as const

export type Size = keyof typeof SIZES
export const SIZE_KEY = 'clusterstats.tileSize'
export const DEFAULT_SIZE: Size = 'dense'
export const isSize = (v: unknown): v is Size => typeof v === 'string' && Object.keys(SIZES).includes(v)

export const SizeContext = createContext<{ size: Size; setSize: (s: Size) => void }>({
  size: DEFAULT_SIZE,
  setSize: () => {},
})
export const useSize = () => useContext(SizeContext)

/** Scale relative to the 16px baseline, for values that cannot be rem (Recharts pixel props). */
export const useScale = () => SIZES[useSize().size].rootPx / 16
