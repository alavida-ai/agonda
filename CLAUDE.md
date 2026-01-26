# Agonda

Desktop app prototype for Marketing Architects. Three surfaces: Markdown Editor, AI Chat, and Kanban Board. Reads/writes directly to the file system (no database).

## Tech Stack

- **Runtime**: Electron 34 + electron-vite 3
- **Frontend**: React 19 + TypeScript 5.7
- **Styling**: Tailwind CSS v4 (CSS-first via `@tailwindcss/vite` plugin, no config files)
- **Components**: shadcn/ui (new-york style, Radix primitives) — this is the primary component library. Use `npx shadcn add <component>` to install new components. Always prefer shadcn components over custom implementations.
- **Icons**: @tabler/icons-react — do NOT use lucide-react. All icons must come from @tabler/icons-react. When installing shadcn components that import lucide, swap the icons to tabler equivalents.
- **Editor**: TipTap (StarterKit + Placeholder + CodeBlockLowlight)
- **State**: Zustand 5
- **File System**: Chokidar (watching), gray-matter (frontmatter parsing)
- **Theme**: Dark mode, OKLCH colors, Amber primary / Gray base, Outfit font

## Commands

```bash
npm run dev       # Launch in development mode
npm run build     # Build for production
npm run preview   # Preview production build
```

## Architecture

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # Window creation, IPC setup, file watcher init
│   ├── file-handlers.ts     # IPC handlers: openFolder, getFileTree, readMarkdownFile, writeMarkdownFile, createFile, fileExists
│   └── file-watcher.ts      # Chokidar watcher emitting fs:fileAdded/Changed/Removed
├── preload/
│   └── index.ts             # contextBridge exposing electron API to renderer
└── renderer/
    ├── index.html
    └── src/
        ├── main.tsx             # React entry point
        ├── App.tsx              # Root layout: sidebar + view switcher + active view
        ├── env.d.ts             # Type declarations for window.electron
        ├── lib/utils.ts         # cn() utility (clsx + tailwind-merge)
        ├── styles/globals.css   # Tailwind v4 theme (OKLCH, dark mode, custom scrollbar)
        ├── stores/
        │   ├── file-store.ts    # projectRoot, fileTree, activeFile, file operations
        │   ├── chat-store.ts    # messages, isStreaming, inputValue
        │   └── ui-store.ts      # activeView, sidebarOpen, chatOpen
        ├── components/
        │   ├── Sidebar.tsx          # File tree navigation
        │   ├── ViewSwitcher.tsx     # Tab bar: Editor / Board + Chat toggle
        │   ├── MarkdownEditor.tsx   # TipTap WYSIWYG editor
        │   ├── ChatInput.tsx        # Textarea + send button
        │   ├── ChatMessage.tsx      # Message bubble with avatar
        │   ├── FrontmatterPanel.tsx # YAML metadata display
        │   └── ui/                  # shadcn components (button, card, avatar, input, scroll-area, separator, sidebar, tooltip, sheet, skeleton, resizable)
        └── views/
            ├── EditorView.tsx   # TipTap editor + frontmatter panel
            ├── ChatView.tsx     # Messages list + input (rendered in right sidebar panel)
            └── BoardView.tsx    # Files grouped by folder as kanban columns
```

## Key Patterns

- **IPC**: Main process handles file I/O, renderer communicates via `window.electron.*` (exposed through preload contextBridge)
- **File tree**: Recursive directory scan, filtered to `.md` files, triggers re-render on Chokidar events
- **Views**: Switched via `activeView` in ui-store (`editor` | `board`). Chat is a right sidebar panel, not a view.
- **Layout**: Uses shadcn `SidebarProvider` + `Sidebar` for both left (file tree) and right (chat) panels with built-in collapse/expand animations
- **shadcn CLI**: `npx shadcn add <component>` works from project root (components.json configured with correct aliases)
- **Tailwind v4**: No `tailwind.config.js` or `postcss.config.js` — all theme config lives in `globals.css` using `@theme inline`

## Current State

- UI shell complete with editor and board views + collapsible chat sidebar
- Collapsible left sidebar (file tree) and right sidebar (chat) using shadcn Sidebar
- File system operations working (open folder, read/write markdown, file watching)
- TipTap editor loads and edits markdown content with Things-inspired styling
- Chat UI renders messages with placeholder echo responses
- Board view groups files by top-level folder
- Collapsible folders in file tree (collapsed by default)

## Not Yet Implemented

- **Claude Agent SDK**: Chat currently echoes messages. Needs real integration with `@anthropic-ai/sdk`
- **Drag-and-drop**: `@dnd-kit` is installed but not wired into BoardView
- **Additional shadcn components**: dialog, dropdown-menu, skeleton, etc. as needed
- **File creation/rename/delete UI**: Handlers exist in main process but no UI triggers
