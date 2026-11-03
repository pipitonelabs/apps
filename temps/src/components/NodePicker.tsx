import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NODES, type NodeSelection } from '@/lib/nodes'

export function NodePicker({ value, onChange }: { value: NodeSelection; onChange: (v: NodeSelection) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as NodeSelection)}>
      <SelectTrigger aria-label="Node" className="h-8 min-w-32 rounded-full border-0 bg-secondary px-4 text-sm text-foreground">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end" className="rounded-xl">
        <SelectItem value="all">All nodes</SelectItem>
        {NODES.map((n) => (
          <SelectItem key={n.name} value={n.name}>
            {n.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
