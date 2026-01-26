import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Markdown } from 'tiptap-markdown'
import { common, createLowlight } from 'lowlight'
import { useFileStore } from '@/stores/file-store'

const lowlight = createLowlight(common)

interface Props {
  content: string
  filePath: string
}

export function MarkdownEditor({ content, filePath }: Props) {
  const { activeFile, saveFile } = useFileStore()
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({
        placeholder: 'Start writing...',
        emptyEditorClass:
          'before:content-[attr(data-placeholder)] before:text-muted-foreground/50 before:float-left before:pointer-events-none before:h-0',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'max-w-none focus:outline-none min-h-[200px] text-foreground',
      },
    },
    onUpdate: ({ editor }) => {
      if (activeFile) {
        if (saveTimeout.current) clearTimeout(saveTimeout.current)
        saveTimeout.current = setTimeout(() => {
          const markdown = editor.storage.markdown.getMarkdown()
          saveFile(filePath, activeFile.frontmatter, markdown)
        }, 300)
      }
    },
  })

  useEffect(() => {
    if (editor && content !== undefined) {
      const currentMarkdown = editor.storage.markdown?.getMarkdown() ?? ''
      if (currentMarkdown !== content) {
        editor.commands.setContent(content)
      }
    }
  }, [filePath])

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [])

  return <EditorContent editor={editor} />
}
