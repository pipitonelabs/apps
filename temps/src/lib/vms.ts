// VMs from KubeVirt's metrics (kubevirt_vm_info), falling back to counting virt-launcher pods
// in kube-state-metrics when KubeVirt is not being scraped (the total is then unknown).
import { promQuery } from './prom'

export const KUBEVIRT_MANAGER_URL = 'https://kubevirt-manager.pipitonelabs.com'

export const VM_QUERIES = {
  total: 'count(kubevirt_vm_info)',
  running: 'count(kubevirt_vm_info{status_group="running"}) or vector(0)',
  launchers:
    'count(kube_pod_info{created_by_kind="VirtualMachineInstance"} * on (namespace, pod) group_left () (kube_pod_status_phase{phase="Running"} == 1)) or vector(0)',
} as const

export interface Vms {
  running: number
  /** All defined VMs, or null when KubeVirt's metrics are not available. */
  total: number | null
}

const first = (v: { value: [number, string] }[]): number | null => {
  const x = v[0] ? Number(v[0].value[1]) : NaN
  return Number.isFinite(x) ? x : null
}

export function buildVms(total: number | null, running: number | null, launchers: number | null): Vms {
  if (total !== null) return { running: running ?? 0, total }
  return { running: launchers ?? 0, total: null }
}

export async function fetchVms(): Promise<Vms> {
  const [t, r, l] = await Promise.all([promQuery(VM_QUERIES.total), promQuery(VM_QUERIES.running), promQuery(VM_QUERIES.launchers)])
  return buildVms(first(t), first(r), first(l))
}

export const vmNote = (v: Vms) => (v.total === null ? `${v.running} running` : `${v.running} of ${v.total} running`)
