import { create } from 'zustand'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ChatStore {
  messages: ChatMessage[]
  isStreaming: boolean
  inputValue: string

  setInputValue: (value: string) => void
  addMessage: (role: 'user' | 'assistant', content: string) => void
  updateLastAssistantMessage: (content: string) => void
  setStreaming: (streaming: boolean) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isStreaming: false,
  inputValue: '',

  setInputValue: (value) => set({ inputValue: value }),

  addMessage: (role, content) => {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: Date.now()
    }
    set((state) => ({ messages: [...state.messages, message] }))
  },

  updateLastAssistantMessage: (content) => {
    set((state) => {
      const messages = [...state.messages]
      const lastIdx = messages.length - 1
      if (lastIdx >= 0 && messages[lastIdx].role === 'assistant') {
        messages[lastIdx] = { ...messages[lastIdx], content }
      }
      return { messages }
    })
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  clearMessages: () => set({ messages: [] })
}))
