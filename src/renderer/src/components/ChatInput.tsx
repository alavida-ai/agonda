import { useRef, KeyboardEvent } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { Button } from '@/components/ui/button'
import { IconSend } from '@tabler/icons-react'

export function ChatInput() {
  const { inputValue, setInputValue, addMessage, isStreaming } = useChatStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isStreaming) return

    addMessage('user', trimmed)
    setInputValue('')

    // TODO: Connect to Claude Agent SDK
    setTimeout(() => {
      addMessage('assistant', `I received your message. Claude Agent SDK integration coming soon.\n\nYou said: "${trimmed}"`)
    }, 500)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 200) + 'px'
    }
  }

  return (
    <div className="flex items-end gap-2 bg-background rounded-xl border border-input focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 transition-all p-2">
      <textarea
        ref={textareaRef}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value)
          handleInput()
        }}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything about your project..."
        rows={1}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none px-2 py-1.5 max-h-[200px]"
        disabled={isStreaming}
      />
      <Button
        onClick={handleSubmit}
        disabled={!inputValue.trim() || isStreaming}
        size="icon-sm"
        className="flex-shrink-0 rounded-lg"
      >
        <IconSend size={14} />
      </Button>
    </div>
  )
}
