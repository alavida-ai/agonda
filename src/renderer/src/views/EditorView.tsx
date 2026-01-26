import { useFileStore } from '@/stores/file-store'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { FrontmatterPanel } from '@/components/FrontmatterPanel'
import { Separator } from '@/components/ui/separator'
import { IconFileText } from '@tabler/icons-react'

export function EditorView() {
  const { activeFile } = useFileStore()

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center">
          <IconFileText size={32} className="text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            Choose a file from the sidebar to start editing
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-6">
          <MarkdownEditor
            content={activeFile.body}
            filePath={activeFile.path}
          />
        </div>
      </div>

      {Object.keys(activeFile.frontmatter).length > 0 && (
        <>
          <Separator orientation="vertical" />
          <aside className="w-64 bg-card p-4 overflow-y-auto">
            <FrontmatterPanel frontmatter={activeFile.frontmatter} filePath={activeFile.path} />
          </aside>
        </>
      )}
    </div>
  )
}
