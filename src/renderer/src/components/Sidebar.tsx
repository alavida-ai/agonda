import { useState } from 'react'
import { useFileStore, type FileEntry } from '@/stores/file-store'
import { Button } from '@/components/ui/button'
import { IconFolder, IconFileText, IconFolderOpen, IconChevronRight } from '@tabler/icons-react'

export function Sidebar() {
  const { fileTree, activeFile, openFile, openFolder, projectRoot } = useFileStore()

  if (!projectRoot) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground text-sm text-center mb-4">
          Open an Agonda project folder to get started
        </p>
        <Button onClick={openFolder}>
          <IconFolderOpen size={16} />
          Open Folder
        </Button>
      </div>
    )
  }

  return (
    <div className="px-2 py-2 pb-4">
      <FileTree entries={fileTree} activeFilePath={activeFile?.path ?? null} onSelect={openFile} />
    </div>
  )
}

function FileTree({
  entries,
  activeFilePath,
  onSelect,
  depth = 0
}: {
  entries: FileEntry[]
  activeFilePath: string | null
  onSelect: (path: string) => void
  depth?: number
}) {
  return (
    <ul className="space-y-0.5">
      {entries.map((entry) => (
        <FileTreeNode
          key={entry.path}
          entry={entry}
          activeFilePath={activeFilePath}
          onSelect={onSelect}
          depth={depth}
        />
      ))}
    </ul>
  )
}

function FileTreeNode({
  entry,
  activeFilePath,
  onSelect,
  depth
}: {
  entry: FileEntry
  activeFilePath: string | null
  onSelect: (path: string) => void
  depth: number
}) {
  const isActive = entry.path === activeFilePath
  const paddingLeft = 8 + depth * 16

  const [expanded, setExpanded] = useState(false)

  if (entry.isDirectory) {
    return (
      <li>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left flex items-center gap-1 px-2 py-1 rounded-md text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          style={{ paddingLeft }}
        >
          <IconChevronRight
            size={12}
            className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          <IconFolder size={14} className="opacity-60" />
          <span className="truncate font-medium">{entry.name}</span>
        </button>
        {expanded && entry.children && (
          <FileTree
            entries={entry.children}
            activeFilePath={activeFilePath}
            onSelect={onSelect}
            depth={depth + 1}
          />
        )}
      </li>
    )
  }

  return (
    <li>
      <button
        onClick={() => onSelect(entry.path)}
        className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
        }`}
        style={{ paddingLeft }}
      >
        <IconFileText size={14} className="opacity-50" />
        <span className="truncate">{entry.name.replace('.md', '')}</span>
      </button>
    </li>
  )
}
