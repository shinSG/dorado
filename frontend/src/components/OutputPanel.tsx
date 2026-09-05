import { useState, useRef, useEffect } from 'react'

interface Props {
  stdout: string
  stderr: string
  feedback?: string
}

// Basic ANSI color code mapping
const ANSI_MAP: Record<string, string> = {
  '30': 'text-gray-900', '31': 'text-red-400', '32': 'text-green-400',
  '33': 'text-yellow-400', '34': 'text-blue-400', '35': 'text-purple-400',
  '36': 'text-cyan-400', '37': 'text-gray-200',
  '1': 'font-bold', '4': 'underline',
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '')
}

function highlightErrors(text: string): string {
  // Highlight common rustc error patterns
  return text
    .replace(/(error\[E\d+\])/g, '<span class="text-red-400 font-bold">$1</span>')
    .replace(/(error:)/g, '<span class="text-red-400 font-bold">$1</span>')
    .replace(/(warning\[.*?\])/g, '<span class="text-yellow-400 font-bold">$1</span>')
    .replace(/(warning:)/g, '<span class="text-yellow-400 font-bold">$1</span>')
    .replace(/(help:)/g, '<span class="text-cyan-400">$1</span>')
    .replace(/(note:)/g, '<span class="text-gray-400">$1</span>')
    .replace(/(-->\s*src\/main\.rs:\d+:\d+)/g, '<span class="text-blue-400">$1</span>')
    .replace(/(✅)/g, '<span class="text-green-400">$1</span>')
    .replace(/(❌)/g, '<span class="text-red-400">$1</span>')
    .replace(/(⚠️)/g, '<span class="text-yellow-400">$1</span>')
    .replace(/(⏱)/g, '<span class="text-yellow-400">$1</span>')
}

export default function OutputPanel({ stdout, stderr, feedback }: Props) {
  const [tab, setTab] = useState<'output' | 'error' | 'feedback'>(
    feedback ? 'feedback' : stdout ? 'output' : 'error'
  )
  const ref = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [stdout, stderr, feedback])

  const hasContent = stdout || stderr || feedback
  if (!hasContent) return null

  const tabs = [
    feedback && { key: 'feedback' as const, label: '📋 判定结果', color: feedback.includes('✅') ? 'text-green-400' : 'text-red-400' },
    { key: 'output' as const, label: 'stdout', color: 'text-gray-300' },
    { key: 'error' as const, label: 'stderr', color: 'text-red-400' },
  ].filter(Boolean)

  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden">
      <div className="flex bg-gray-800 border-b border-gray-700">
        {tabs.map((t) => t && (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <pre
        ref={ref}
        className="p-4 text-sm font-mono bg-gray-900 overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap"
        dangerouslySetInnerHTML={{
          __html: tab === 'feedback'
            ? highlightErrors(stripAnsi(feedback || ''))
            : tab === 'output'
            ? (stdout ? highlightErrors(stripAnsi(stdout)) : '<span class="text-gray-500">无输出</span>')
            : (stderr ? highlightErrors(stripAnsi(stderr)) : '<span class="text-gray-500">无错误</span>'),
        }}
      />
    </div>
  )
}
