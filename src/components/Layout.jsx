import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Tag, PieChart, Filter, Tags, Menu, X } from 'lucide-react'
import UserMenu from './UserMenu'

const Layout = () => {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: PieChart },
    { path: '/tagging', label: 'Tagging', icon: Tag },
    { path: '/detailed', label: 'Detailed', icon: Filter },
    { path: '/categories', label: 'Categories', icon: Tags },
  ]

  const isActive = (path) => location.pathname === path

  const handleNavClick = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Desktop: always visible, Mobile: slide-in */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Finance Tracker</h1>
            <p className="text-sm text-gray-300 mt-1">Household Spending</p>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close navigation menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4" role="navigation" aria-label="Main navigation">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={handleNavClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                      active
                        ? 'bg-teal text-white shadow-sm'
                        : 'text-gray-200 hover:bg-white/10'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={24} aria-hidden="true" />
                    <span className="font-medium text-base">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 bg-[radial-gradient(circle_at_1px_1px,#e5e7eb_1px,transparent_0)] [background-size:24px_24px]">
        <div className="max-w-7xl mx-auto p-4 md:p-8 page-fade">
          {/* Mobile Header with Hamburger */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
              aria-label="Open navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu size={24} />
            </button>
            <div className="md:hidden text-lg font-bold text-gray-900">Finance Tracker</div>
            <UserMenu />
          </div>

          {/* Desktop: Just UserMenu aligned right (already in the header above on mobile) */}
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
