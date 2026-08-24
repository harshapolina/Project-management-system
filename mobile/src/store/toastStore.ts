import { create } from 'zustand'

export type LiveToast = {
  id: string
  title: string
  body?: string
  type?: string
}

interface ToastState {
  current: LiveToast | null
  queue: LiveToast[]
  push: (toast: Omit<LiveToast, 'id'>) => void
  dismiss: () => void
}

let counter = 0

export const useToastStore = create<ToastState>((set, get) => ({
  current: null,
  queue: [],
  push: (toast) => {
    const item: LiveToast = { ...toast, id: `toast-${++counter}` }
    const { current } = get()
    if (!current) {
      set({ current: item })
      return
    }
    set({ queue: [...get().queue, item] })
  },
  dismiss: () => {
    const [next, ...rest] = get().queue
    set({ current: next || null, queue: rest })
  },
}))
