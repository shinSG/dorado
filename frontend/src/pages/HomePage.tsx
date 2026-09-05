import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchChapters, getStats, type Chapter } from '../api'
import ChapterCard from '../components/ChapterCard'

const stageNames: Record<number, { title: string; icon: string }> = {
  1: { title: '语法基础', icon: '🌱' },
  2: { title: '系统编程', icon: '⚙️' },
  3: { title: '异步与网络', icon: '🌐' },
  4: { title: '高并发网关', icon: '🚀' },
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-16 text-right">{completed}/{total} ({pct}%)</span>
    </div>
  )
}

export default function HomePage() {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [stats, setStats] = useState<{ chapters: number; exercises: number; submissions: number; pass_rate: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchChapters(), getStats().catch(() => null)])
      .then(([chs, s]) => { setChapters(chs); setStats(s) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-orange-400 text-lg">加载中...</div></div>
  if (error) return <div className="text-center py-20"><p className="text-red-400">加载失败: {error}</p><p className="text-gray-500 mt-2">请确认后端服务已启动</p></div>

  const grouped = chapters.reduce<Record<number, Chapter[]>>((acc, ch) => {
    ;(acc[ch.stage] ??= []).push(ch)
    return acc
  }, {})

  const completedCount = chapters.filter((c) => c.progress_status === 'completed').length

  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">🦀 <span className="text-orange-400">Dorado</span> Rust 学习平台</h1>
        <p className="text-gray-400 text-lg">从零基础到高并发网关，系统化学习路径</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 text-center">
          <div className="text-2xl font-bold text-orange-400">{chapters.length}</div>
          <div className="text-xs text-gray-500 mt-1">总章节</div>
        </div>
        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 text-center">
          <div className="text-2xl font-bold text-green-400">{completedCount}</div>
          <div className="text-xs text-gray-500 mt-1">已完成</div>
        </div>
        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats?.exercises ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">练习题</div>
        </div>
        <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 text-center">
          <div className="text-2xl font-bold text-purple-400">{stats?.pass_rate ?? 0}%</div>
          <div className="text-xs text-gray-500 mt-1">通过率</div>
        </div>
      </div>

      {/* Overall progress */}
      <div className="mb-8 p-4 rounded-xl bg-gray-900/50 border border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">总体进度</span>
          <span className="text-sm text-gray-400">{completedCount}/{chapters.length}</span>
        </div>
        <ProgressBar completed={completedCount} total={chapters.length} />
      </div>

      {/* Chapter groups */}
      {Object.entries(grouped).map(([stage, chs]) => {
        const info = stageNames[Number(stage)] ?? { title: `阶段 ${stage}`, icon: '📚' }
        const done = chs.filter((c) => c.progress_status === 'completed').length
        return (
          <div key={stage} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span>{info.icon}</span>
                <span>阶段 {stage}：{info.title}</span>
                <span className="text-sm text-gray-500 font-normal">({chs.length} 章)</span>
              </h2>
              <span className="text-xs text-gray-500">{done}/{chs.length} 完成</span>
            </div>
            <ProgressBar completed={done} total={chs.length} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3">
              {chs.map((ch) => (
                <ChapterCard key={ch.slug} chapter={ch} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Quick links */}
      <div className="mt-12 text-center">
        <Link
          to="/setup"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-colors"
        >
          🛠 环境部署向导
        </Link>
      </div>
    </div>
  )
}
