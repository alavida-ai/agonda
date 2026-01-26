import type { ChatMessage as ChatMessageType } from '@/stores/chat-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { IconSparkles, IconUser } from '@tabler/icons-react'

interface Props {
  message: ChatMessageType
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
        <AvatarFallback className={isUser ? 'bg-muted' : 'bg-primary/10'}>
          {isUser ? (
            <IconUser size={14} className="text-muted-foreground" />
          ) : (
            <IconSparkles size={14} className="text-primary" />
          )}
        </AvatarFallback>
      </Avatar>

      <Card className={`max-w-[80%] px-4 py-2.5 shadow-none ${
        isUser
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card border-border'
      }`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
      </Card>
    </div>
  )
}
