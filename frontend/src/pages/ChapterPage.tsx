import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowRight, Check, PanelLeft, Play, Send } from 'lucide-react'
import { fetchChapter, fetchChapters, runCode, submitExercise, updateProgress, type Chapter, type ChapterDetail, type Exercise, type RunResult } from '../api'
import { availableChapters, readSaved, save } from '../learning'
import CodeEditor from '../components/CodeEditor'
import OutputPanel from '../components/OutputPanel'

function ExerciseWorkspace({ exercise, onPassed, next }: { exercise: Exercise; onPassed: () => Promise<void>; next: () => void }) {
  const isOutput = exercise.type === 'output'
  const key = `dorado:${isOutput ? 'answer' : 'draft'}:${exercise.id}`
  const [code, setCode] = useState(() => isOutput ? exercise.template_code : readSaved(key) ?? exercise.template_code)
  const [answer, setAnswer] = useState(() => isOutput ? readSaved(key) ?? '' : '')
  const [saved, setSaved] = useState(true)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<(RunResult & { feedback?: string }) | null>(null)
  const [revision, setRevision] = useState(0)
  const [passed, setPassed] = useState(exercise.passed)
  const [error, setError] = useState('')
  const [mobileTab, setMobileTab] = useState('task')
  const [reset, setReset] = useState(false)
  function changeCode(value: string) { setCode(value); setSaved(save(key, value)) }
  function changeAnswer(value: string) { setAnswer(value); setSaved(save(key, value)) }
  async function execute(submit: boolean) {
    if (running) return
    setRunning(true)
    setError('')
    setMobileTab('code')
    try {
      if (submit) {
        const data = await submitExercise(exercise.id, isOutput ? { answer } : { code })
        setResult({ stdout: data.stdout, stderr: '', feedback: data.stderr, exit_code: data.passed ? 0 : 1, timed_out: false })
        if (data.passed) { setPassed(true); await onPassed() }
      } else if (!isOutput) setResult(await runCode(code))
      setRevision(value => value + 1)
    } catch (e) { setError(e instanceof Error ? e.message : '请求失败，请重试') }
    finally { setRunning(false) }
  }
  return <>
    <div className="mobile-tabs tabbar"><button className={mobileTab === 'task' ? 'active' : ''} onClick={() => setMobileTab('task')}>题目</button><button className={mobileTab === 'code' ? 'active' : ''} onClick={() => setMobileTab('code')}>代码与结果</button></div>
    <div className="workspace-grid">
      <section className={'task-pane ' + (mobileTab !== 'task' ? 'mobile-hidden' : '')}>
        <span className="eyebrow">{{ free: '编程练习', fix: '修复代码', fill: '补全代码', output: '预测输出', test: '测试练习' }[exercise.type] || '练习'}</span>
        <h2>{exercise.title}</h2>
        <div className="lesson-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{exercise.description}</ReactMarkdown></div>
        <div className="task-note">{isOutput ? '不要运行代码，先在纸上或心里推演，再填写你认为程序会打印的完整内容。' : '修改右侧代码，运行检查结果，然后提交练习。'}</div>
        {exercise.hint && <details className="knowledge"><summary>需要一点提示？</summary><p>{exercise.hint}</p></details>}
        {passed && <div className="passed-box"><Check size={18} /><span>这道题已通过</span><button className="quiet-link" disabled={running} onClick={next}>继续 <ArrowRight size={16} /></button></div>}
      </section>
      <section className={'editor-pane ' + (mobileTab !== 'code' ? 'mobile-hidden' : '')}>
        <div className="editor-heading"><span>{exercise.type === 'test' ? 'lib.rs' : 'main.rs'}</span><span className="muted">{isOutput ? '题目代码 · 只读' : saved ? '草稿已保存在此浏览器' : '草稿保存失败，请复制备份'}</span></div>
        <div onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void execute(isOutput || event.shiftKey) } }}>
          <CodeEditor value={code} onChange={changeCode} height={isOutput ? '300px' : '400px'} readOnly={isOutput || running} />
          {isOutput && <label className="answer-field"><span>你的预测输出</span><textarea value={answer} onChange={event => changeAnswer(event.target.value)} rows={4} placeholder="逐行填写程序的输出，注意大小写、标点和换行" disabled={running} /></label>}
        </div>
        <div className="editor-actions">
          {!isOutput && <button className="button" disabled={running} onClick={() => void execute(false)}><Play size={15} />运行</button>}
          <button className="button primary" disabled={running || (isOutput && !answer.trim())} onClick={() => void execute(true)}><Send size={15} />{running ? '处理中…' : isOutput ? '提交预测' : '提交练习'}</button>
          <button className="quiet-link reset-link" disabled={running} onClick={() => setReset(!reset)}>重置</button>
        </div>
        {reset && <div className="reset-confirm">{isOutput ? '清空当前预测答案？' : '恢复初始代码将覆盖当前草稿。'}<button className="button" onClick={() => { if (isOutput) changeAnswer(''); else changeCode(exercise.template_code); setResult(null); setReset(false) }}>{isOutput ? '确认清空' : '确认恢复'}</button><button className="quiet-link" onClick={() => setReset(false)}>取消</button></div>}
        <p className="shortcut">{isOutput ? '⌘ / Ctrl + Enter 提交预测' : '⌘ / Ctrl + Enter 运行 · 加 Shift 提交'}</p>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div aria-live="polite">{result ? <OutputPanel key={revision} {...result} /> : <div className="result-placeholder">{isOutput ? '提交后会在这里显示评测结果' : '运行结果会显示在这里'}</div>}</div>
      </section>
    </div>
  </>
}

export default function ChapterPage() {
  const { slug } = useParams()
  return <ChapterScreen key={slug} slug={slug!} />
}

function ChapterScreen({ slug }: { slug: string }) {
  const [chapter, setChapter] = useState<ChapterDetail | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [active, setActive] = useState(0)
  const [error, setError] = useState('')
  const [sidebar, setSidebar] = useState(false)
  const [completeError, setCompleteError] = useState('')
  useEffect(() => {
    let cancelled = false
    Promise.all([fetchChapter(slug!), fetchChapters()]).then(([data, list]) => {
      if (cancelled) return
      const available = availableChapters(list)
      if (available.find(ch => ch.id === data.id)?.progress_status === 'locked') { setError('请先完成前一章，再开始本章练习。'); return }
      setChapter(data)
      setChapters(available)
      const remembered = Number(readSaved('dorado:exercise:' + slug))
      const index = data.exercises.findIndex(ex => ex.id === remembered)
      setActive(index >= 0 ? index : Math.max(0, data.exercises.findIndex(ex => !ex.passed)))
      save('dorado:last-chapter', slug!)
    }).catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [slug])
  if (error) return <div className="empty-state" role="alert">{error}<Link className="button" to="/">返回课程</Link></div>
  if (!chapter) return <div className="empty-state">正在准备练习…</div>
  const exercise = chapter.exercises[active]
  const done = chapter.exercises.filter(ex => ex.passed).length
  const allPassed = chapter.exercises.length > 0 && done === chapter.exercises.length
  const nextChapter = chapters[chapters.findIndex(ch => ch.id === chapter.id) + 1]
  function select(index: number) {
    setActive(index)
    save('dorado:exercise:' + slug, String(chapter!.exercises[index].id))
  }
  async function complete() {
    try {
      await updateProgress(chapter!.id, 'completed')
      setChapter(current => current ? { ...current, progress_status: 'completed' } : current)
      setChapters(current => availableChapters(current.map(ch => ch.id === chapter!.id ? { ...ch, progress_status: 'completed' } : ch)))
      setCompleteError('')
    } catch { setCompleteError('练习已通过，章节进度保存失败。请重试。') }
  }
  async function passed() {
    const exercises = chapter!.exercises.map(ex => ex.id === exercise.id ? { ...ex, passed: true } : ex)
    setChapter(current => current ? { ...current, exercises } : current)
    if (exercises.every(ex => ex.passed)) await complete()
  }
  return <div className={'learning-shell ' + (sidebar ? '' : 'sidebar-closed')}>
    <aside className="course-sidebar"><div className="eyebrow">课程目录</div>{chapters.map(ch => ch.progress_status === 'locked'
      ? <span className="sidebar-item locked" key={ch.id}>{String(ch.order).padStart(2, '0')} {ch.title}</span>
      : <Link onClick={() => setSidebar(false)} className={'sidebar-item ' + (ch.id === chapter.id ? 'selected' : '')} to={'/chapter/' + ch.slug} key={ch.id}>{String(ch.order).padStart(2, '0')} {ch.title}{ch.progress_status === 'completed' && <Check size={13} />}</Link>)}</aside>
    <div className="learning-main">
      <div className="chapter-toolbar"><button className="icon-button" aria-label={sidebar ? '收起目录' : '展开目录'} aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}><PanelLeft size={18} /></button><h1>{chapter.title}</h1><span className="muted">{done} / {chapter.exercises.length} 已通过</span></div>
      <div className="exercise-tabs" aria-label="选择练习">{chapter.exercises.map((ex, index) => <button key={ex.id} className={index === active ? 'active' : ''} aria-pressed={index === active} onClick={() => select(index)}>{ex.passed ? <Check size={14} /> : <span>{index + 1}</span>}{ex.title}</button>)}</div>
      {exercise ? <ExerciseWorkspace key={exercise.id} exercise={exercise} onPassed={passed} next={() => { if (active + 1 < chapter.exercises.length) select(active + 1); else if (!allPassed) select(chapter.exercises.findIndex(ex => !ex.passed)); else document.getElementById('chapter-finish')?.scrollIntoView({ behavior: 'smooth' }) }} /> : <div className="empty-state">本章暂无练习，可以先阅读相关知识。</div>}
      <details className="chapter-knowledge"><summary>相关知识 · {chapter.title}</summary><article className="lesson-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{chapter.content}</ReactMarkdown></article></details>
      {allPassed && <div className="chapter-finish" id="chapter-finish"><div><strong>本章练习全部通过</strong><p className="muted">{completeError || (chapter.progress_status === 'completed' ? '进度已保存，继续下一个小目标。' : '保存本章进度后继续学习。')}</p></div>{chapter.progress_status !== 'completed' ? <button className="button primary" onClick={() => void complete()}>保存进度</button> : <Link className="button primary" to={nextChapter ? '/chapter/' + nextChapter.slug : '/'}>{nextChapter ? '下一章' : '返回课程'}<ArrowRight size={16} /></Link>}</div>}
    </div>
  </div>
}
