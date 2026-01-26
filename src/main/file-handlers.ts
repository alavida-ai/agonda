import { IpcMain, dialog } from 'electron'
import { readFile, writeFile, readdir, stat, mkdir } from 'fs/promises'
import { join, relative, extname } from 'path'
import matter from 'gray-matter'

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

let projectRoot: string | null = null

async function buildFileTree(dirPath: string, rootPath: string): Promise<FileEntry[]> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const tree: FileEntry[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue

    const fullPath = join(dirPath, entry.name)
    const relPath = relative(rootPath, fullPath)

    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath, rootPath)
      tree.push({
        name: entry.name,
        path: fullPath,
        relativePath: relPath,
        isDirectory: true,
        children
      })
    } else if (extname(entry.name) === '.md') {
      tree.push({
        name: entry.name,
        path: fullPath,
        relativePath: relPath,
        isDirectory: false
      })
    }
  }

  return tree.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })
}

export function setupFileHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (!result.canceled && result.filePaths[0]) {
      projectRoot = result.filePaths[0]
      return projectRoot
    }
    return null
  })

  ipcMain.handle('fs:getProjectRoot', () => {
    return projectRoot
  })

  ipcMain.handle('fs:setProjectRoot', (_event, path: string) => {
    projectRoot = path
    return projectRoot
  })

  ipcMain.handle('fs:getFileTree', async () => {
    if (!projectRoot) return []
    return buildFileTree(projectRoot, projectRoot)
  })

  ipcMain.handle('fs:readMarkdownFile', async (_event, filePath: string) => {
    const content = await readFile(filePath, 'utf-8')
    const parsed = matter(content)
    return {
      path: filePath,
      relativePath: projectRoot ? relative(projectRoot, filePath) : filePath,
      content,
      frontmatter: parsed.data,
      body: parsed.content
    } as MarkdownFile
  })

  ipcMain.handle('fs:writeMarkdownFile', async (_event, filePath: string, frontmatter: Record<string, unknown>, body: string) => {
    const content = matter.stringify(body, frontmatter)
    await writeFile(filePath, content, 'utf-8')
    return true
  })

  ipcMain.handle('fs:createFile', async (_event, filePath: string, frontmatter: Record<string, unknown>, body: string) => {
    const dir = join(filePath, '..')
    await mkdir(dir, { recursive: true })
    const content = matter.stringify(body, frontmatter)
    await writeFile(filePath, content, 'utf-8')
    return true
  })

  ipcMain.handle('fs:fileExists', async (_event, filePath: string) => {
    try {
      await stat(filePath)
      return true
    } catch {
      return false
    }
  })
}
