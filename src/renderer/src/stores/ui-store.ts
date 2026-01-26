import { create } from 'zustand'

export type View = 'editor' | 'board'

interface UIStore {
  activeView: View
  sidebarOpen: boolean
  chatOpen: boolean

  setActiveView: (view: View) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setChatOpen: (open: boolean) => void
  toggleChat: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeView: 'editor',
  sidebarOpen: true,
  chatOpen: false,

  setActiveView: (view) => set({ activeView: view }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setChatOpen: (open) => set({ chatOpen: open }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen }))
}))
