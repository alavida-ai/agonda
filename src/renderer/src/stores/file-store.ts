import { create } from 'zustand'

export interface FileEntry {
  name: string
  path: string
  relativePath: string
  isDirectory: boolean
  children?: FileEntry[]
}

export interface MarkdownFile {
  path: string
  relativePath: string
  content: string
  frontmatter: Record<string, unknown>
  body: string
}

interface FileStore {
  projectRoot: string | null
  fileTree: FileEntry[]
  activeFile: MarkdownFile | null
  loading: boolean

  setProjectRoot: (path: string) => void
  loadFileTree: () => Promise<void>
  openFile: (path: string) => Promise<void>
  saveFile: (path: string, frontmatter: Record<string, unknown>, body: string) => Promise<void>
  openFolder: () => Promise<void>
}

export const useFileStore = create<FileStore>((set, get) => ({
  projectRoot: null,
  fileTree: [],
  activeFile: null,
  loading: false,

  setProjectRoot: (path) => {
    set({ projectRoot: path })
  },

  loadFileTree: async () => {
    set({ loading: true })
    const tree = await window.electron.getFileTree()
    set({ fileTree: tree as FileEntry[], loading: false })
  },

  openFile: async (path) => {
    const file = await window.electron.readMarkdownFile(path)
    set({ activeFile: file as MarkdownFile })
  },

  saveFile: async (path, frontmatter, body) => {
    await window.electron.writeMarkdownFile(path, frontmatter, body)
    const { activeFile } = get()
    if (activeFile?.path === path) {
      set({ activeFile: { ...activeFile, frontmatter, body } })
    }
  },

  openFolder: async () => {
    const path = await window.electron.openFolder()
    if (path) {
      set({ projectRoot: path })
      await window.electron.setProjectRoot(path)
      const tree = await window.electron.getFileTree()
      set({ fileTree: tree as FileEntry[] })
    }
  }
}))
