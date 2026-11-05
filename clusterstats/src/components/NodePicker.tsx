import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NODES, type NodeSelection } from '@/lib/nodes'

export function NodePicker({ value, onChange }: { value: NodeSelection; onChange: (v: NodeSelection) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as NodeSelection)}>
      <SelectTrigger aria-label="Node">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
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
