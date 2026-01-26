import { useEffect, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { EditorView } from './views/EditorView'
import { BoardView } from './views/BoardView'
import { ChatView } from './views/ChatView'
import { ViewSwitcher } from './components/ViewSwitcher'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/resizable'
import { useUIStore } from './stores/ui-store'
import { useFileStore } from './stores/file-store'
import { IconLayoutSidebar, IconMessageCircle, IconFolder } from '@tabler/icons-react'
import { Button } from './components/ui/button'
import { ScrollArea } from './components/ui/scroll-area'
import type { ImperativePanelHandle } from 'react-resizable-panels'

function App() {
  const { activeView, sidebarOpen, setSidebarOpen, toggleSidebar, chatOpen, setChatOpen, toggleChat } = useUIStore()
  const { projectRoot, loadFileTree } = useFileStore()

  const leftPanelRef = useRef<ImperativePanelHandle>(null)
  const rightPanelRef = useRef<ImperativePanelHandle>(null)

  useEffect(() => {
    if (projectRoot) {
      loadFileTree()
    }
  }, [projectRoot])

  useEffect(() => {
    const handleChange = () => loadFileTree()
    window.electron.onFileAdded(handleChange)
    window.electron.onFileRemoved(handleChange)
  }, [])

  // Sync panel state with store
  useEffect(() => {
    if (sidebarOpen) {
      leftPanelRef.current?.expand()
    } else {
      leftPanelRef.current?.collapse()
    }
  }, [sidebarOpen])

  useEffect(() => {
    if (chatOpen) {
      rightPanelRef.current?.expand()
    } else {
      rightPanelRef.current?.collapse()
    }
  }, [chatOpen])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'b' && !e.shiftKey) {
        e.preventDefault()
        toggleSidebar()
      }
      if (e.metaKey && e.shiftKey && e.key === 'B') {
        e.preventDefault()
        toggleChat()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar, toggleChat])

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {/* Titlebar drag region with fixed toggle buttons inside */}
      <div className="fixed top-0 left-0 right-0 h-12 z-50 flex items-center" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        {/* Left toggle — after traffic lights */}
        <div className="ml-[78px]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleSidebar}
          >
            <IconLayoutSidebar size={16} />
          </Button>
        </div>

        <div className="flex-1" />

        {/* Right toggle — far right */}
        <div className="mr-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleChat}
          >
            <IconMessageCircle size={16} />
          </Button>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left Sidebar */}
        <ResizablePanel
          id="left-sidebar"
          ref={leftPanelRef}
          order={1}
          defaultSize={20}
          minSize={15}
          maxSize={35}
          collapsible
          collapsedSize={0}
          onCollapse={() => setSidebarOpen(false)}
          onExpand={() => setSidebarOpen(true)}
        >
          <div className="h-full flex flex-col bg-sidebar">
            {/* Spacer for titlebar - sidebar bg extends behind it */}
            <div className="h-12 shrink-0" />
            <div className="flex items-center gap-2 px-3 h-10 border-b border-sidebar-border shrink-0">
              <IconFolder size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium text-sidebar-foreground">Files</span>
            </div>
            <ScrollArea className="flex-1">
              <Sidebar />
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle className="hover:bg-primary transition-colors duration-150" />

        {/* Main Content */}
        <ResizablePanel id="main-content" order={2} defaultSize={80} minSize={30}>
          <main className="flex flex-col h-full min-w-0 bg-background pt-12">
            <ViewSwitcher />
            <div className="flex-1 overflow-hidden">
              {activeView === 'editor' && <EditorView />}
              {activeView === 'board' && <BoardView />}
            </div>
          </main>
        </ResizablePanel>

        <ResizableHandle className="hover:bg-primary transition-colors duration-150" />

        {/* Right Sidebar */}
        <ResizablePanel
          id="right-sidebar"
          ref={rightPanelRef}
          order={3}
          defaultSize={0}
          minSize={20}
          maxSize={40}
          collapsible
          collapsedSize={0}
          onCollapse={() => setChatOpen(false)}
          onExpand={() => setChatOpen(true)}
        >
          <div className="h-full flex flex-col bg-card">
            {/* Spacer for titlebar - sidebar bg extends behind it */}
            <div className="h-12 shrink-0" />
            <div className="flex items-center gap-2 px-3 h-10 border-b border-border shrink-0">
              <IconMessageCircle size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium text-card-foreground">Chat</span>
            </div>
            <ChatView />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export default App
