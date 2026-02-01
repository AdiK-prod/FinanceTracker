import { Link, Outlet, useLocation } from 'react-router-dom'
import { Tag, PieChart, Filter, Tags } from 'lucide-react'
import UserMenu from './UserMenu'

const Layout = () => {
  const location = useLocation()

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: PieChart },
    { path: '/tagging', label: 'Tagging', icon: Tag },
    { path: '/detailed', label: 'Detailed', icon: Filter },
    { path: '/categories', label: 'Categories', icon: Tags },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Fixed Sidebar */}
      <aside className="w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-bold text-white">Finance Tracker</h1>
          <p className="text-sm text-gray-300 mt-1">Household Spending</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 ease-in-out ${
                      active
                        ? 'bg-teal text-white shadow-sm'
                        : 'text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    <Icon size={24} />
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
        <div className="max-w-7xl mx-auto p-8 page-fade">
          <div className="flex justify-end mb-6">
            <UserMenu />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
