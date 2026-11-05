import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { RANGES, type RangeKey } from '@/lib/series'

export function RangePicker({ value, onChange }: { value: RangeKey; onChange: (r: RangeKey) => void }) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v as RangeKey)} className="gap-1">
      {(Object.keys(RANGES) as RangeKey[]).map((k) => (
        <ToggleGroupItem
          key={k}
          value={k}
          className="h-8 rounded-full px-3.5 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-secondary data-[state=on]:text-foreground"
        >
          {k}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
