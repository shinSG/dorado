import { Link, useLocation } from 'react-router-dom'
import { Home, BookOpen, Settings, User, LogOut } from 'lucide-react'
import { getUser, logout } from '../api'
import { useState } from 'react'

export default function Navbar() {
  const { pathname } = useLocation()
  const user = getUser()
  const [showUser, setShowUser] = useState(false)

  const links = [
    { to: '/', label: '首页', icon: Home },
    { to: '/setup', label: '环境部署', icon: Settings },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-orange-400 text-lg">
            <span>🦀</span> <span>Dorado</span>
          </Link>
          <div className="flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname === to
                    ? 'bg-gray-800 text-orange-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="relative">
          {user ? (
            <button
              onClick={() => setShowUser(!showUser)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <User className="w-4 h-4" />
              {user.display_name || user.username}
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-orange-400 hover:bg-orange-500/10 transition-colors"
            >
              <User className="w-4 h-4" />
              登录
            </Link>
          )}

          {showUser && user && (
            <div className="absolute right-0 top-full mt-1 w-40 py-1 rounded-lg bg-gray-800 border border-gray-700 shadow-xl">
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-700">
                {user.username}
              </div>
              <button
                onClick={() => { logout(); setShowUser(false); window.location.reload() }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
