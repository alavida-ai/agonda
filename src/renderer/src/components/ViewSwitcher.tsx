import { useUIStore, type View } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { IconFileText, IconLayoutKanban } from '@tabler/icons-react'

const views: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'editor', label: 'Editor', icon: <IconFileText size={16} /> },
  { id: 'board', label: 'Board', icon: <IconLayoutKanban size={16} /> }
]

export function ViewSwitcher() {
  const { activeView, setActiveView } = useUIStore()

  return (
    <div className="flex items-center h-10 px-3 border-b border-border bg-background gap-1">
      {views.map((view) => (
        <Button
          key={view.id}
          variant={activeView === view.id ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveView(view.id)}
          className="gap-1.5"
        >
          {view.icon}
          {view.label}
        </Button>
      ))}
    </div>
  )
}
