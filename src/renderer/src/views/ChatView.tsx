import { useRef, useEffect } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { ChatMessage } from '@/components/ChatMessage'
import { ChatInput } from '@/components/ChatInput'
import { ScrollArea } from '@/components/ui/scroll-area'
import { IconBulb } from '@tabler/icons-react'

export function ChatView() {
  const { messages } = useChatStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center max-w-sm px-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <IconBulb size={24} className="text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                What can I help with?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                I can read and write files in your project, answer questions about your domains,
                and help you organize your knowledge.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm p-3">
        <ChatInput />
      </div>
    </div>
  )
}
