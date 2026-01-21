import { Link, useLocation } from 'react-router-dom'
import { Upload, Tag, PieChart, Filter } from 'lucide-react'

const Layout = ({ children }) => {
  const location = useLocation()

  const navItems = [
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/tagging', label: 'Tagging', icon: Tag },
    { path: '/dashboard', label: 'Dashboard', icon: PieChart },
    { path: '/detailed', label: 'Detailed', icon: Filter },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Fixed Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Finance Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Household Spending</p>
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
                    className={`flex items-center gap-3 px-4 py-2 rounded-md transition-all duration-200 ${
                      active
                        ? 'bg-teal text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
