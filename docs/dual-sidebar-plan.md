# Dual Sidebar Layout — Implementation Plan

## Reference

Based on Obsidian's layout pattern (see `random-images/` screenshots):

- **Three-zone layout**: Left sidebar | Main content | Right sidebar
- **Distinct backgrounds**: Each zone has a slightly different shade (sidebars darker than main content)
- **Fixed toggle positions**: Toggle buttons remain in place regardless of sidebar state
- **Left toggle**: Positioned next to the Mac traffic light buttons (top-left)
- **Right toggle**: Positioned at the top-right corner
- **Width adjustable**: Both sidebars can be resized by dragging the divider edge
- **Collapsible**: Both sidebars can be fully collapsed/expanded with smooth animation

---

## Current Problems

1. The nested `SidebarProvider` approach doesn't work — only the right sidebar responds to toggles
2. shadcn's `Sidebar` component uses `min-h-svh`, `peer` selectors, and cookie persistence designed for Next.js pages, not Electron flex layouts
3. No width adjustment (drag-to-resize) capability
4. Toggle buttons move when sidebars open/close

---

## Proposed Architecture

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Titlebar drag region (h-12, fixed)                     │
├────┬────────────────────────────────────────────┬───────┤
│ LT │              ViewSwitcher                  │  RT   │
├────┼────────────────────────────────────────────┼───────┤
│    │                                            │       │
│ L  │                                            │  R    │
│ S  │            Main Content                    │  S    │
│ B  │         (Editor / Board)                   │  B    │
│    │                                            │       │
│    │                                            │       │
├────┼────────────────────────────────────────────┼───────┤
└────┴────────────────────────────────────────────┴───────┘

LT = Left toggle button (fixed position, always visible)
RT = Right toggle button (fixed position, always visible)
LSB = Left Sidebar (file tree, collapsible, resizable)
RSB = Right Sidebar (chat, collapsible, resizable)
```

### Key Decision: shadcn Sidebar vs Custom Panels

**Option A: Two independent shadcn SidebarProviders (current broken approach)**
- Problem: CSS variable conflicts, `peer` selectors don't work across providers, `min-h-svh` breaks Electron layout

**Option B: Single SidebarProvider with `side="left"` + separate right panel**
- Problem: Only one sidebar gets the shadcn collapse behavior

**Option C (Recommended): Custom resizable panel layout using shadcn primitives**
- Use `react-resizable-panels` (already installed as v2) for the three-panel structure
- Style panels to match shadcn conventions (same colors, borders, transitions)
- Use shadcn `Button`, `ScrollArea`, `Tooltip` etc. inside each panel
- Add CSS transitions for collapse/expand animation
- The panels ARE the sidebars — no need for shadcn's `Sidebar` wrapper which is designed for page-level navigation

**Why Option C**: The shadcn Sidebar component is fundamentally designed for a single collapsible nav panel in a page layout. It uses page-level CSS (`min-h-svh`, `peer` selectors, cookie state). For an Electron app with TWO independently resizable + collapsible panels, a custom approach using the resizable panels library gives us full control while still using shadcn's UI primitives for everything inside.

---

## Implementation Steps

### Step 1: Layout Shell (App.tsx)

Replace the current `SidebarProvider` nesting with a `ResizablePanelGroup`:

```tsx
<div className="h-screen w-screen overflow-hidden bg-background">
  {/* Titlebar drag region */}
  <div className="fixed top-0 left-0 right-0 h-12 z-50" />

  {/* Fixed toggle buttons — these never move */}
  <div className="fixed top-12 left-[78px] z-40">
    <ToggleLeftSidebar />
  </div>
  <div className="fixed top-12 right-3 z-40">
    <ToggleRightSidebar />
  </div>

  <ResizablePanelGroup direction="horizontal" className="h-full pt-12">
    {/* Left Sidebar */}
    <ResizablePanel
      ref={leftRef}
      defaultSize={20}
      minSize={15}
      maxSize={35}
      collapsible
      collapsedSize={0}
      onCollapse={() => setSidebarOpen(false)}
      onExpand={() => setSidebarOpen(true)}
    >
      <LeftSidebarContent />
    </ResizablePanel>

    <ResizableHandle />

    {/* Main Content */}
    <ResizablePanel defaultSize={80} minSize={30}>
      <ViewSwitcher />
      <EditorView / BoardView />
    </ResizablePanel>

    <ResizableHandle />

    {/* Right Sidebar */}
    <ResizablePanel
      ref={rightRef}
      defaultSize={0}
      minSize={20}
      maxSize={40}
      collapsible
      collapsedSize={0}
      onCollapse={() => setChatOpen(false)}
      onExpand={() => setChatOpen(true)}
    >
      <RightSidebarContent />
    </ResizablePanel>
  </ResizablePanelGroup>
</div>
```

### Step 2: Toggle Button Positioning

The toggle buttons must be **fixed positioned** so they don't move when panels resize:

- **Left toggle**: `fixed top-12 left-[78px]` — positioned right after the Mac traffic lights (which take ~70px on macOS). The `78px` accounts for the 3 buttons + padding.
- **Right toggle**: `fixed top-12 right-3` — always at the top-right corner

Both buttons sit in a thin bar (h-10) that spans the top of the content area below the titlebar.

### Step 3: Background Colors

Three distinct background shades (dark theme, using OKLCH from our palette):

| Zone | Current Variable | Visual |
|------|-----------------|--------|
| Left sidebar | `--sidebar` (oklch 0.11) | Darkest |
| Main content | `--background` (oklch 0.13) | Medium |
| Right sidebar | `--sidebar` (oklch 0.11) | Darkest |

This matches the Obsidian pattern where sidebars are darker than the content area. The right sidebar (chat) uses `--card` to visually distinguish it from the file tree.

### Step 4: Left Sidebar Content

```
┌─────────────────────┐
│ [Header: "Files" + X] │  ← h-10, border-bottom
├─────────────────────┤
│                     │
│  File tree          │  ← ScrollArea, collapsible folders
│  (recursive)        │
│                     │
└─────────────────────┘
```

- Header with label + close button
- `ScrollArea` wrapping the file tree
- Collapsible folders (collapsed by default)
- Background: `bg-sidebar` (darkest shade)

### Step 5: Right Sidebar Content (Chat)

```
┌─────────────────────┐
│ [Header: "Chat" + X] │  ← h-10, border-bottom
├─────────────────────┤
│                     │
│  Messages           │  ← ScrollArea, flex-1
│  (scrollable)       │
│                     │
├─────────────────────┤
│  [Input area]       │  ← border-top, fixed bottom
└─────────────────────┘
```

- Header with label + close button
- Messages area with auto-scroll
- Fixed input area at the bottom
- Background: `bg-card` (slightly lighter)

### Step 6: Resize Handle Styling

Minimal, matching Obsidian's thin dividers:

```css
/* Thin 1px border that highlights on hover */
.resize-handle {
  width: 1px;
  background: var(--border);
  transition: background 150ms;
}
.resize-handle:hover {
  background: var(--primary);
  width: 2px;
}
```

### Step 7: Collapse/Expand Animation

Add `transition-[flex] duration-200 ease-in-out` to both collapsible panels. This animates the flex-basis change when toggling via buttons. Dragging is still smooth since 200ms is short.

### Step 8: ViewSwitcher Adjustments

The ViewSwitcher sits inside the main content panel (not affected by sidebar state):

```
┌─────────────────────────────────────┐
│  [Editor] [Board]                   │  ← Left-aligned tabs
└─────────────────────────────────────┘
```

Remove the sidebar/chat toggle buttons from ViewSwitcher since they're now fixed-positioned in the window chrome.

### Step 9: State Management (ui-store)

```typescript
interface UIStore {
  activeView: 'editor' | 'board'
  sidebarOpen: boolean
  chatOpen: boolean

  setActiveView: (view: View) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setChatOpen: (open: boolean) => void
  toggleChat: () => void
}
```

No width state needed — `react-resizable-panels` manages sizes internally.

### Step 10: Keyboard Shortcuts

- `Cmd+B` — Toggle left sidebar
- `Cmd+Shift+B` — Toggle right sidebar (chat)

---

## Files to Modify

| File | Changes |
|------|---------|
| `App.tsx` | Replace SidebarProvider nesting with ResizablePanelGroup + fixed toggle buttons |
| `ui-store.ts` | Already correct (sidebarOpen, chatOpen) |
| `ViewSwitcher.tsx` | Remove toggle buttons, keep only view tabs |
| `Sidebar.tsx` | Add header back with close button (since not using ShadcnSidebar wrapper) |
| `ChatView.tsx` | Add header back with close button |
| `globals.css` | Possibly adjust sidebar/card color values for better contrast |
| `components/ui/sidebar.tsx` | Can be removed or kept for future use — not used in this layout |

## Files to Remove

| File | Reason |
|------|--------|
| `components/ChatPanel.tsx` | Already deleted |

## Dependencies

- `react-resizable-panels` v2 (already installed)
- All shadcn primitives (Button, ScrollArea, Tooltip) — already installed
- No new packages needed

---

## Visual Spec (ASCII)

### Both sidebars open:
```
●●● [◧]  New tab   ×  +                              ▽  [◨]
├────┼────────────────────────────────────────────┼───────┤
│    │  [Editor] [Board]                          │       │
│ F  ├────────────────────────────────────────────┤  C    │
│ i  │                                            │  h    │
│ l  │                                            │  a    │
│ e  │         Editor Content                     │  t    │
│ s  │                                            │       │
│    │                                            │  M    │
│    │                                            │  s    │
│    │                                            │  g    │
│    │                                            │  s    │
│    ├────────────────────────────────────────────┤       │
│    │                                            │ [___] │
└────┴────────────────────────────────────────────┴───────┘
 ↕drag                    ↕drag
```

### Left sidebar closed:
```
●●● [◧]  [Editor] [Board]                              [◨]
├────────────────────────────────────────────────────────┤
│                                                        │
│                  Editor Content                        │
│                  (full width)                          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Both closed:
```
●●● [◧]  [Editor] [Board]                              [◨]
├────────────────────────────────────────────────────────┤
│                                                        │
│                  Editor Content                        │
│                  (maximum width)                       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

[◧] = Left sidebar toggle (never moves from this position)
[◨] = Right sidebar toggle (never moves from this position)

---

## Edge Cases

- **Minimum width**: If window is too narrow for both sidebars at min-size, the main content panel should take priority (min 30%)
- **Drag past minimum**: Dragging a panel handle past min-size collapses it fully (react-resizable-panels handles this with `collapsible` prop)
- **Toggle while dragging**: Ignore toggle clicks during active drag
- **Window resize**: Panels should proportionally adjust (default behavior of the library)
