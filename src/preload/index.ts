import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  openFolder: () => Promise<string | null>
  getProjectRoot: () => Promise<string | null>
  setProjectRoot: (path: string) => Promise<string>
  getFileTree: () => Promise<unknown[]>
  readMarkdownFile: (path: string) => Promise<unknown>
  writeMarkdownFile: (path: string, frontmatter: Record<string, unknown>, body: string) => Promise<boolean>
  createFile: (path: string, frontmatter: Record<string, unknown>, body: string) => Promise<boolean>
  fileExists: (path: string) => Promise<boolean>
  onFileChanged: (callback: (path: string) => void) => void
  onFileAdded: (callback: (path: string) => void) => void
  onFileRemoved: (callback: (path: string) => void) => void
}

const api: ElectronAPI = {
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  getProjectRoot: () => ipcRenderer.invoke('fs:getProjectRoot'),
  setProjectRoot: (path: string) => ipcRenderer.invoke('fs:setProjectRoot', path),
  getFileTree: () => ipcRenderer.invoke('fs:getFileTree'),
  readMarkdownFile: (path: string) => ipcRenderer.invoke('fs:readMarkdownFile', path),
  writeMarkdownFile: (path: string, frontmatter: Record<string, unknown>, body: string) =>
    ipcRenderer.invoke('fs:writeMarkdownFile', path, frontmatter, body),
  createFile: (path: string, frontmatter: Record<string, unknown>, body: string) =>
    ipcRenderer.invoke('fs:createFile', path, frontmatter, body),
  fileExists: (path: string) => ipcRenderer.invoke('fs:fileExists', path),
  onFileChanged: (callback) => ipcRenderer.on('fs:fileChanged', (_event, path) => callback(path)),
  onFileAdded: (callback) => ipcRenderer.on('fs:fileAdded', (_event, path) => callback(path)),
  onFileRemoved: (callback) => ipcRenderer.on('fs:fileRemoved', (_event, path) => callback(path))
}

contextBridge.exposeInMainWorld('electron', api)
