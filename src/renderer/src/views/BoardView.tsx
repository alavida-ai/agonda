import { useMemo } from 'react'
import { useFileStore, type FileEntry } from '@/stores/file-store'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { IconLayoutKanban } from '@tabler/icons-react'

interface BoardCard {
  name: string
  path: string
  domain: string
}

export function BoardView() {
  const { fileTree, openFile } = useFileStore()

  const columns = useMemo(() => {
    const groups: Record<string, BoardCard[]> = {}

    function collectFiles(entries: FileEntry[], domain: string) {
      for (const entry of entries) {
        if (entry.isDirectory && entry.children) {
          const domainName = domain || entry.name
          collectFiles(entry.children, domainName)
        } else if (!entry.isDirectory) {
          const d = domain || 'root'
          if (!groups[d]) groups[d] = []
          groups[d].push({
            name: entry.name.replace('.md', ''),
            path: entry.path,
            domain: d
          })
        }
      }
    }

    collectFiles(fileTree, '')
    return groups
  }, [fileTree])

  if (Object.keys(columns).length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <IconLayoutKanban size={32} className="text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Open a project to see your files as cards</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex gap-4 p-6 items-start">
        {Object.entries(columns).map(([domain, cards]) => (
          <div
            key={domain}
            className="flex-shrink-0 w-72 bg-card rounded-xl border border-border p-3"
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-3">
              {domain}
            </h3>
            <div className="space-y-2">
              {cards.map((card) => (
                <Card
                  key={card.path}
                  className="p-3 cursor-pointer hover:border-primary/30 transition-colors shadow-none"
                  onClick={() => openFile(card.path)}
                >
                  <p className="text-sm text-foreground font-medium truncate">
                    {card.name}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
