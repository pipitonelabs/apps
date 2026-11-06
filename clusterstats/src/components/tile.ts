/** Shared 3-row tile layout (label / value / footer) so every tile lines up in the grid. */

import { createContext, useContext } from 'react'

export const SIZES = {
  default: { tile: 'min-h-32 gap-4 p-4 sm:p-5', value: 'text-2xl sm:text-3xl' },
  snug: { tile: 'min-h-28 gap-3 p-4', value: 'text-2xl' },
  compact: { tile: 'min-h-24 gap-2 p-3 sm:p-4', value: 'text-xl sm:text-2xl' },
  dense: { tile: 'min-h-20 gap-1.5 px-3 py-2.5', value: 'text-lg sm:text-xl' },
} as const

export type TileSize = keyof typeof SIZES
export const TILE_SIZE_KEY = 'clusterstats.tileSize'
export const isTileSize = (v: unknown): v is TileSize => typeof v === 'string' && Object.keys(SIZES).includes(v)

export const TileSizeContext = createContext<{ size: TileSize; setSize: (s: TileSize) => void }>({
  size: 'default',
  setSize: () => {},
})
export const useTileSize = () => useContext(TileSizeContext)

/** Size-dependent tile classes (container and value); the head/foot rows are the same at every size. */
export function useTile() {
  const s = SIZES[useTileSize().size]
  return { tile: `flex flex-col justify-between bg-card ${s.tile}`, value: `truncate leading-tight font-light tracking-tight ${s.value}` }
}

export const TILE_HEAD = 'flex h-4 items-center justify-between'
export const TILE_FOOT = 'flex h-4 items-end gap-2 text-xs leading-4 text-muted-foreground'
