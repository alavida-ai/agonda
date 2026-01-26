import { BrowserWindow } from 'electron'
import { watch, type FSWatcher } from 'chokidar'

let watcher: FSWatcher | null = null

export function setupFileWatcher(window: BrowserWindow | null): void {
  // Will be initialized when a project root is set
}

export function startWatching(projectRoot: string, window: BrowserWindow | null): void {
  if (watcher) {
    watcher.close()
  }

  watcher = watch(projectRoot, {
    ignored: [
      /(^|[\/\\])\./,  // dotfiles
      /node_modules/
    ],
    persistent: true,
    ignoreInitial: true,
    depth: 10
  })

  watcher
    .on('add', (path) => {
      window?.webContents.send('fs:fileAdded', path)
    })
    .on('change', (path) => {
      window?.webContents.send('fs:fileChanged', path)
    })
    .on('unlink', (path) => {
      window?.webContents.send('fs:fileRemoved', path)
    })
    .on('addDir', (path) => {
      window?.webContents.send('fs:dirAdded', path)
    })
    .on('unlinkDir', (path) => {
      window?.webContents.send('fs:dirRemoved', path)
    })
}

export function stopWatching(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
}
