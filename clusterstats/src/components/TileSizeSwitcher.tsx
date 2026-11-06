import { useEffect, useState, type ReactNode } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TILE_SIZE_KEY, TileSizeContext, isTileSize, useTileSize, type TileSize } from './tile'

function readSize(): TileSize {
  try {
    const v = window.localStorage.getItem(TILE_SIZE_KEY)
    if (isTileSize(v)) return v
  } catch {
    /* storage unavailable */
  }
  return 'default'
}

export function TileSizeProvider({ children }: { children: ReactNode }) {
  const [size, setSize] = useState<TileSize>(readSize)
  useEffect(() => {
    try {
      window.localStorage.setItem(TILE_SIZE_KEY, size)
    } catch {
      /* storage unavailable */
    }
  }, [size])
  return <TileSizeContext.Provider value={{ size, setSize }}>{children}</TileSizeContext.Provider>
}

const OPTIONS: { size: TileSize; label: string; name: string }[] = [
  { size: 'dense', label: 'S', name: 'Dense tiles' },
  { size: 'compact', label: 'M', name: 'Compact tiles' },
  { size: 'snug', label: 'L', name: 'Snug tiles' },
  { size: 'default', label: 'XL', name: 'Default tiles' },
]

export function TileSizeSwitcher() {
  const { size, setSize } = useTileSize()
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={1}
      value={size}
      onValueChange={(v) => isTileSize(v) && setSize(v)}
      aria-label="Tile size"
    >
      {OPTIONS.map((o) => (
        <Tooltip key={o.size}>
          <TooltipTrigger asChild>
            <ToggleGroupItem value={o.size} aria-label={o.name} className="rounded-lg px-2.5 text-muted-foreground aria-checked:border-foreground/40 aria-checked:bg-accent aria-checked:text-foreground">
              {o.label}
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>{o.name}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  )
}
