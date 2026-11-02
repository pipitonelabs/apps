import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { RANGES, type RangeKey } from '@/lib/series'

export function RangePicker({ value, onChange }: { value: RangeKey; onChange: (r: RangeKey) => void }) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as RangeKey)}
      className="rounded-xl bg-card/60 p-1 ring-1 ring-border"
    >
      {(Object.keys(RANGES) as RangeKey[]).map((k) => (
        <ToggleGroupItem
          key={k}
          value={k}
          className="rounded-lg px-3 text-[11px] tracking-[0.18em] uppercase data-[state=on]:bg-primary/15 data-[state=on]:text-primary data-[state=on]:shadow-[0_0_14px_var(--glow)]"
        >
          {k}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
