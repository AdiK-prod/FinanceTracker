import { LogOut, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const UserMenu = () => {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3 py-1.5 shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50">
          <User size={20} className="text-teal-600" />
        </div>
        <span className="text-sm font-medium text-gray-700">{user.email}</span>
      </div>
      <button
        onClick={() => signOut()}
        className="btn-secondary flex items-center gap-2"
      >
        <LogOut size={20} />
        Sign Out
      </button>
    </div>
  )
}

export default UserMenu
