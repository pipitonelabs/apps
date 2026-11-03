export type NodeName = 'm0' | 'm1' | 'm2' | 'w2'
export type Metric = 'cpu' | 'nvme0' | 'nvme1' | 'mem'

export const NODES: { name: NodeName; ip: string; hasMemSensor: boolean; hw: string }[] = [
  { name: 'm0', ip: '192.168.10.10', hasMemSensor: true, hw: 'MS-01 · i9-12900H' },
  { name: 'm1', ip: '192.168.10.11', hasMemSensor: true, hw: 'MS-01 · i9-12900H' },
  { name: 'm2', ip: '192.168.10.12', hasMemSensor: true, hw: 'MS-01 · i9-12900H' },
  { name: 'w2', ip: '192.168.10.15', hasMemSensor: false, hw: 'M5 Plus · Ryzen 7 5825U' },
]

export const METRICS: { key: Metric; label: string }[] = [
  { key: 'cpu', label: 'CPU' },
  { key: 'nvme0', label: 'NVMe 0' },
  { key: 'nvme1', label: 'NVMe 1' },
  { key: 'mem', label: 'Memory' },
]

export function nodeByInstance(instance: string): NodeName | undefined {
  const ip = instance.split(':')[0]
  return NODES.find((n) => n.ip === ip)?.name
}

const T = 'node_hwmon_temp_celsius'
export const QUERIES: Record<Metric, string> = {
  cpu: `${T}{chip=~"platform_coretemp_0|pci0000:00_0000:00:18_3",sensor="temp1"}`,
  nvme0: `${T}{chip="nvme_nvme0",sensor="temp1"}`,
  nvme1: `${T}{chip="nvme_nvme1",sensor="temp1"}`,
  mem: `max by (instance) (${T}{chip=~"i2c_0_0_005."})`,
}

const UP_SELECTOR = 'up{instance=~"192\\\\.168\\\\.10\\\\.1[0-5]:9100"}'
export const UP_QUERY = UP_SELECTOR
/** Unix seconds of each node's last successful scrape within Prometheus retention (1m resolution). */
export const LAST_SEEN_QUERY = `max by (instance) (max_over_time(timestamp(${UP_SELECTOR} == 1)[14d:1m]))`

export type NodeSelection = 'all' | NodeName

/** Nodes to draw for a metric under the current dropdown selection. */
export function visibleNodes(metric: Metric, selection: NodeSelection) {
  return NODES.filter((n) => (selection === 'all' || n.name === selection) && (metric !== 'mem' || n.hasMemSensor))
}
