import { ref } from 'vue'

export interface Crumb { label: string; to?: string }

const crumbs = ref<Crumb[]>([])

export function useBreadcrumbs() {
  function setBreadcrumbs(list: Crumb[]) {
    crumbs.value = list
  }
  function clearBreadcrumbs() {
    crumbs.value = []
  }
  return { crumbs, setBreadcrumbs, clearBreadcrumbs }
}
