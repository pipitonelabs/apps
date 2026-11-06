import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DEFAULT_SIZE, SIZES, SIZE_KEY, SizeContext, isSize, useSize, type Size } from './size'

function readSize(): Size {
  try {
    const v = window.localStorage.getItem(SIZE_KEY)
    if (isSize(v)) return v
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_SIZE
}

export function SizeProvider({ children }: { children: ReactNode }) {
  const [size, setSize] = useState<Size>(readSize)
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.size = size
    root.style.fontSize = `${SIZES[size].rootPx}px`
  }, [size])
  useEffect(() => {
    try {
      window.localStorage.setItem(SIZE_KEY, size)
    } catch {
      /* storage unavailable */
    }
  }, [size])
  return <SizeContext.Provider value={{ size, setSize }}>{children}</SizeContext.Provider>
}

const OPTIONS = (Object.keys(SIZES) as Size[]).map((size) => ({ size, ...SIZES[size] }))

export function SizeSwitcher() {
  const { size, setSize } = useSize()
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={1}
      value={size}
      onValueChange={(v) => isSize(v) && setSize(v)}
      aria-label="Page size"
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
