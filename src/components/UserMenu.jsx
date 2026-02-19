import { useState, useRef, useEffect } from 'react'
import { LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const UserMenu = () => {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!user) return null

  // Derive initials from email
  const initials = user.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'U'

  // Truncate email display
  const emailDisplay = user.email && user.email.length > 24
    ? user.email.slice(0, 22) + '…'
    : user.email

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg bg-white border border-gray-200 pl-1.5 pr-3 py-1.5 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        style={{boxShadow:'0 1px 2px 0 rgb(0 0 0/0.05)'}}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="w-6 h-6 rounded-md bg-teal-600 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-white leading-none">{initials}</span>
        </div>
        <span className="text-sm font-medium text-gray-700 hidden sm:block">{emailDisplay}</span>
        <ChevronDown
          size={14}
          className={`text-gray-400 hidden sm:block transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-gray-200 py-1 z-50 animate-scale-in"
          style={{boxShadow:'0 10px 15px -3px rgb(0 0 0/0.08), 0 4px 6px -4px rgb(0 0 0/0.05)'}}>
          <div className="px-3.5 py-2.5 border-b border-gray-100 mb-1">
            <p className="text-xs font-semibold text-gray-900 truncate">{user.email}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Signed in</p>
          </div>
          <button
            onClick={() => { setOpen(false); signOut() }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={14} className="text-gray-400" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
