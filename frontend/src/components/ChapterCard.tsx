import { Link } from 'react-router-dom'
import type { ReactElement } from 'react'
import { CheckCircle, Lock, Unlock, Loader } from 'lucide-react'
import type { Chapter } from '../api'

const statusIcon: Record<string, ReactElement> = {
  completed: <CheckCircle className="w-5 h-5 text-green-500" />,
  in_progress: <Loader className="w-5 h-5 text-blue-400 animate-spin" />,
  unlocked: <Unlock className="w-5 h-5 text-orange-500" />,
  locked: <Lock className="w-5 h-5 text-gray-600" />,
}

interface Props {
  chapter: Chapter
}

export default function ChapterCard({ chapter }: Props) {
  const isLocked = chapter.progress_status === 'locked'

  return (
    <Link
      to={isLocked ? '#' : `/chapter/${chapter.slug}`}
      className={`block p-4 rounded-lg border transition-all ${
        isLocked
          ? 'bg-gray-900/50 border-gray-800 opacity-60 cursor-not-allowed'
          : 'bg-gray-900 border-gray-800 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-100 truncate">{chapter.title}</h3>
          {chapter.subtitle && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{chapter.subtitle}</p>
          )}
        </div>
        <div className="flex-shrink-0">{statusIcon[chapter.progress_status]}</div>
      </div>
    </Link>
  )
}
