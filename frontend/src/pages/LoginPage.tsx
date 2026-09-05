import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register, setAuth } from '../api'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let res
      if (mode === 'register') {
        res = await register(username, password, displayName)
      } else {
        res = await login(username, password)
      }
      setAuth(res.token, { user_id: res.user_id, username: res.username, display_name: res.display_name })
      navigate('/')
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">🦀 Dorado</h1>
        <p className="text-gray-400 mt-2">Rust 学习平台</p>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
        <div className="flex mb-6 border-b border-gray-700">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === 'login' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-400'
            }`}
          >
            登录
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === 'register' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-400'
            }`}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">用户名</label>
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:border-orange-500 focus:outline-none"
              placeholder="至少2位" required minLength={2}
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">显示名称（可选）</label>
              <input
                type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:border-orange-500 focus:outline-none"
                placeholder="给自己起个名字"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1">密码</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:border-orange-500 focus:outline-none"
              placeholder="至少4位" required minLength={4}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors disabled:opacity-50"
          >
            {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          {mode === 'login' ? '没有账号？' : '已有账号？'}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-orange-400 ml-1 hover:underline">
            {mode === 'login' ? '去注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  )
}
