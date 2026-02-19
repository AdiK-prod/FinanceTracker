import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Tag, PieChart, Filter, Tags, Menu, X, PanelLeftClose, PanelLeft } from 'lucide-react'
import UserMenu from './UserMenu'

const SIDEBAR_COLLAPSED_KEY = 'finance-tracker-sidebar-collapsed'

const Layout = () => {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) ?? 'false')
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(sidebarCollapsed))
    } catch {}
  }, [sidebarCollapsed])

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: PieChart },
    { path: '/tagging', label: 'Tagging', icon: Tag },
    { path: '/detailed', label: 'Detailed', icon: Filter },
    { path: '/categories', label: 'Categories', icon: Tags },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="flex h-screen bg-gray-50">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 flex flex-col
        bg-gray-950 text-white shrink-0
        transform transition-[transform,width] duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        w-64 ${sidebarCollapsed ? 'md:w-[3.75rem]' : ''}
      `}>
        {/* Logo */}
        <div className={`h-16 flex items-center shrink-0 border-b border-white/[0.06] px-4 ${sidebarCollapsed ? 'md:justify-center md:px-0' : 'justify-between'}`}>
          {sidebarCollapsed ? (
            <>
              <div className="flex items-center gap-2 md:hidden">
                <div className="w-7 h-7 bg-teal-500 rounded-md flex items-center justify-center shrink-0">
                  <span className="text-xs font-black text-white">FT</span>
                </div>
                <span className="font-bold text-white text-base">Finance Tracker</span>
              </div>
              <div className="w-7 h-7 bg-teal-500 rounded-md items-center justify-center shrink-0 hidden md:flex">
                <span className="text-xs font-black text-white">FT</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 bg-teal-500 rounded-md flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-white">FT</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate leading-tight">Finance Tracker</p>
                <p className="text-xs text-gray-400 leading-tight">Household Spending</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 overflow-hidden" role="navigation" aria-label="Main navigation">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`flex items-center rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 focus:ring-offset-gray-950 ${
                      sidebarCollapsed ? 'justify-center p-2.5 md:p-2.5' : 'gap-3 px-3 py-2.5'
                    } ${
                      active
                        ? 'bg-teal-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.07]'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={18} aria-hidden="true" className="shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="font-medium text-sm truncate">{item.label}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Collapse toggle – desktop only */}
        <div className="p-2 border-t border-white/[0.06] hidden md:block">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className={`flex items-center w-full rounded-lg py-2 transition-colors text-gray-400 hover:text-white hover:bg-white/[0.07] focus:outline-none ${sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'}`}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeft size={18} aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose size={18} aria-hidden="true" />
                <span className="text-xs font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 md:px-8 md:py-8 page-fade">
          {/* Mobile top bar */}
          <div className="flex items-center justify-between mb-5 md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-teal-500 rounded-md flex items-center justify-center">
                <span className="text-[10px] font-black text-white">FT</span>
              </div>
              <span className="text-sm font-bold text-gray-900">Finance Tracker</span>
            </div>
            <UserMenu />
          </div>

          {/* Desktop top bar */}
          <div className="hidden md:flex justify-end mb-6">
            <UserMenu />
          </div>

          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
