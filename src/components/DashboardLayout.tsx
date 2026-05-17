import { ReactNode, useState } from "react"
import { AppSidebar } from "./AppSidebar"
import { SideChat } from "./SideChat"
import { PanelLeft, PanelLeftClose } from "lucide-react"

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-canvas)' }}>
      {/* Fixed Sidebar */}
      <AppSidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 border-b flex items-center pl-8 pr-6 justify-between sticky top-0 z-40" style={{ borderColor: 'var(--color-hairline)', backgroundColor: 'var(--color-canvas)' }}>
          <div className="flex items-center gap-4">
            <button
              className="dashboard-collapse-btn rounded-lg transition-all"
              style={{
                color: 'var(--color-body)',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-surface-strong)';
                e.currentTarget.style.color = 'var(--color-ink)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-body)';
              }}
              onClick={toggleSidebar}
              title={isCollapsed ? "Show Sidebar" : "Hide Sidebar"}
            >
              {isCollapsed ? <PanelLeft size={20} className="dashboard-collapse-icon" /> : <PanelLeftClose size={20} className="dashboard-collapse-icon" />}
            </button>
          </div>

          <div className="flex items-center gap-4">
             {/* Header links removed as requested */}
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global side chat — available on every page */}
      <SideChat />
    </div>
  )
}

export default DashboardLayout
