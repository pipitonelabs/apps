import type { NodeLive } from '@/lib/live'
import type { NodeName } from '@/lib/nodes'
import { NodeCard } from './NodeCard'

export function LiveGrid({ nodes, lastSeen }: { nodes: NodeLive[]; lastSeen: Partial<Record<NodeName, number | null>> }) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {nodes.map((n) => (
        <NodeCard key={n.node} live={n} lastSeen={lastSeen[n.node]} />
      ))}
    </section>
  )
}
