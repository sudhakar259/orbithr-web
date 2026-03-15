import { reactive } from 'vue'

const state = reactive({
  show: false,
  title: '',
  message: '',
  resolve: null as ((v: boolean) => void) | null,
})

export function useConfirm() {
  const confirm = (title: string, message: string): Promise<boolean> => {
    state.show    = true
    state.title   = title
    state.message = message
    return new Promise(resolve => { state.resolve = resolve })
  }
  const accept = () => { state.show = false; state.resolve?.(true) }
  const cancel = () => { state.show = false; state.resolve?.(false) }
  return { confirm, accept, cancel, confirmState: state }
}
