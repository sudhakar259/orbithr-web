import { ref } from 'vue'
import api from '@/services/api'
import { useRouter } from 'vue-router'

interface EmployeeRecord {
  id: number
  first_name: string
  last_name: string
  designation?: string
  department?: string
  avatar_url?: string
}

interface SearchResult {
  id: number
  type: 'employee'
  label: string
  sub: string
  to: string
  avatar?: string
}

export function useGlobalSearch() {
  const router = useRouter()
  const query = ref('')
  const results = ref<SearchResult[]>([])
  const loading = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  async function search(q: string) {
    if (!q.trim()) {
      results.value = []
      return
    }
    loading.value = true
    try {
      const { data } = await api.get('/employees', { params: { search: q, per_page: 6 } })
      const list = data.data ?? data
      results.value = list.map((e: EmployeeRecord) => ({
        id: e.id,
        type: 'employee' as const,
        label: `${e.first_name} ${e.last_name}`,
        sub: [e.designation, e.department].filter(Boolean).join(' · '),
        to: `/app/employees/${e.id}`,
        avatar: e.avatar_url,
      }))
    } catch {
      results.value = []
    } finally {
      loading.value = false
    }
  }

  function onInput(q: string) {
    query.value = q
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => search(q), 280)
  }

  function clear() {
    query.value = ''
    results.value = []
    if (timer) clearTimeout(timer)
  }

  function navigate(result: SearchResult) {
    router.push(result.to)
    clear()
  }

  function goToAll() {
    if (query.value.trim()) {
      router.push({ name: 'employees', query: { search: query.value.trim() } })
    }
    clear()
  }

  return { query, results, loading, onInput, clear, navigate, goToAll }
}
