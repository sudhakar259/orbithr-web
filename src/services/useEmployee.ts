// src/composables/useEmployee.ts
import { ref, onMounted } from 'vue'
import { employeeApi } from '@/services/api'

export function useEmployee(id?: number) {
  const employee = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchEmployee = async () => {
    if (!id) return
    loading.value = true
    try {
      const { data } = await employeeApi.getById(id)
      employee.value = data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to load employee.'
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchEmployee)
  return { employee, loading, error, fetchEmployee }
}
