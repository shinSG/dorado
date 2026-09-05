import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ChevronLeft, ChevronRight, Play, Send, Lightbulb, CheckCircle, RotateCcw } from 'lucide-react'
import {
  fetchChapter, runCode, submitExercise, updateProgress,
  type ChapterDetail, type Exercise, type RunResult,
} from '../api'
import CodeEditor from '../components/CodeEditor'
import OutputPanel from '../components/OutputPanel'

const exerciseTypeLabel: Record<string, string> = {
  free: '自由练习',
  fill: '填空题',
  fix: '找错题',
  output: '预测输出',
  test: '测试题',
}

function ExerciseBlock({ exercise, onPassed }: { exercise: Exercise; onPassed: () => void }) {
  const [code, setCode] = useState(exercise.template_code)
  const [result, setResult] = useState<RunResult | null>(null)
  const [feedback, setFeedback] = useState<string>('')
  const [running, setRunning] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [passed, setPassed] = useState(exercise.passed)

  const handleRun = async () => {
    setRunning(true)
    setFeedback('')
    try {
      const res = await runCode(code)
      setResult(res)
    } catch (e: any) {
      setResult({ stdout: '', stderr: e.message, exit_code: -1, timed_out: false })
    } finally {
      setRunning(false)
    }
  }

  const handleSubmit = async () => {
    setRunning(true)
    try {
      const res = await submitExercise(exercise.id, code)
      setResult({ stdout: res.stdout, stderr: res.stderr, exit_code: res.passed ? 0 : 1, timed_out: false })
      setFeedback(res.stderr) // Backend puts feedback in stderr
      if (res.passed) {
        setPassed(true)
        onPassed()
      }
    } catch (e: any) {
      setResult({ stdout: '', stderr: e.message, exit_code: -1, timed_out: false })
      setFeedback('')
    } finally {
      setRunning(false)
    }
  }

  const handleReset = () => {
    setCode(exercise.template_code)
    setResult(null)
    setFeedback('')
    setShowHint(false)
  }

  return (
    <div className={`rounded-xl border p-5 transition-colors ${passed ? 'border-green-500/30 bg-green-500/5' : 'border-gray-700 bg-gray-900/50'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
              {exerciseTypeLabel[exercise.type] ?? exercise.type}
            </span>
            <h3 className="font-semibold text-gray-100">{exercise.title}</h3>
            {passed && <CheckCircle className="w-5 h-5 text-green-500" />}
          </div>
          <p className="text-sm text-gray-400 mt-1">{exercise.description}</p>
        </div>
      </div>

      <CodeEditor value={code} onChange={setCode} height="280px" />

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Play className="w-4 h-4" />
          {running ? '运行中...' : '运行'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={running}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          提交
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-400 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          重置
        </button>
        {exercise.hint && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-sm transition-colors ml-auto"
          >
            <Lightbulb className="w-4 h-4" />
            提示
          </button>
        )}
      </div>

      {showHint && exercise.hint && (
        <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm">
          💡 {exercise.hint}
        </div>
      )}

      {result && (
        <div className="mt-3">
          <OutputPanel stdout={result.stdout} stderr={result.stderr} feedback={feedback} />
        </div>
      )}
    </div>
  )
}

export default function ChapterPage() {
  const { slug } = useParams<{ slug: string }>()
  const [chapter, setChapter] = useState<ChapterDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const data = await fetchChapter(slug)
      setChapter(data)
      // Mark as in_progress
      if (data.progress_status === 'unlocked') {
        updateProgress(data.id, 'in_progress')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="text-center py-20 text-orange-400">加载中...</div>
  if (error) return <div className="text-center py-20 text-red-400">错误: {error}</div>
  if (!chapter) return <div className="text-center py-20 text-gray-500">章节不存在</div>

  const allPassed = chapter.exercises.length > 0 && chapter.exercises.every((e) => e.passed)

  return (
    <div>
      {/* Breadcrumb */}
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-orange-400 mb-6">
        <ChevronLeft className="w-4 h-4" /> 返回目录
      </Link>

      {/* Chapter header */}
      <div className="mb-8">
        <p className="text-sm text-orange-400 mb-1">阶段 {chapter.stage}</p>
        <h1 className="text-3xl font-bold text-gray-100">{chapter.title}</h1>
        <p className="text-gray-400 mt-1">{chapter.subtitle}</p>
      </div>

      {/* Chapter content (markdown) */}
      <article className="prose prose-invert prose-orange max-w-none mb-12
        prose-headings:text-gray-100 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
        prose-p:text-gray-300 prose-p:leading-relaxed
        prose-code:text-orange-300 prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-lg
        prose-strong:text-gray-100 prose-li:text-gray-300
        prose-a:text-orange-400 prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-orange-500/30 prose-blockquote:bg-orange-500/5 prose-blockquote:rounded-lg
        prose-table:text-sm
      ">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '')
              const isBlock = String(children).includes('\n')
              if (match) {
                return (
                  <SyntaxHighlighter
                    style={oneDark as any}
                    language={match[1]}
                    PreTag="div"
                    className="!bg-gray-900 !rounded-lg"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                )
              }
              if (isBlock) {
                return <code className={className} {...props}>{children}</code>
              }
              return <code className={className} {...props}>{children}</code>
            },
          }}
        >
          {chapter.content}
        </ReactMarkdown>
      </article>

      {/* Exercises */}
      {chapter.exercises.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-6 flex items-center gap-2">
            ✏️ 练习题
            <span className="text-sm font-normal text-gray-500">
              ({chapter.exercises.filter((e) => e.passed).length}/{chapter.exercises.length} 已完成)
            </span>
          </h2>
          <div className="space-y-6">
            {chapter.exercises.map((ex) => (
              <ExerciseBlock key={ex.id} exercise={ex} onPassed={() => load()} />
            ))}
          </div>
        </div>
      )}

      {/* Chapter completion */}
      {allPassed && (
        <div className="mt-10 p-6 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-semibold text-green-400">🎉 恭喜！本章所有练习已完成</p>
          <button
            onClick={() => chapter && updateProgress(chapter.id, 'completed')}
            className="mt-3 px-6 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors"
          >
            标记为已完成
          </button>
        </div>
      )}
    </div>
  )
}
