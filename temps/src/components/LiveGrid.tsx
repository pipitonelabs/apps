import type { NodeLive } from '@/lib/live'
import { NodeCard } from './NodeCard'

export function LiveGrid({ nodes }: { nodes: NodeLive[] }) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {nodes.map((n) => (
        <NodeCard key={n.node} live={n} />
      ))}
    </section>
  )
}
