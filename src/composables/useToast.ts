import { reactive } from 'vue'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

const state = reactive<{ items: Toast[] }>({ items: [] })
let nextId = 0

export function useToast() {
  const show = (message: string, type: Toast['type'] = 'success', duration = 3000) => {
    const id = ++nextId
    state.items.push({ id, message, type })
    setTimeout(() => {
      state.items = state.items.filter(t => t.id !== id)
    }, duration)
  }

  return {
    toasts: state.items,
    success: (msg: string) => show(msg, 'success'),
    error:   (msg: string) => show(msg, 'error', 4000),
    info:    (msg: string) => show(msg, 'info'),
    warning: (msg: string) => show(msg, 'warning'),
  }
}
