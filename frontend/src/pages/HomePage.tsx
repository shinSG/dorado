import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Lock } from 'lucide-react'
import { fetchChapters, type Chapter } from '../api'
import { availableChapters, readSaved } from '../learning'

export default function HomePage() {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetchChapters().then(data => setChapters(availableChapters(data))).catch(e => setError(e.message)).finally(() => setLoading(false)) }, [])
  if (loading) return <div className="empty-state">正在准备课程…</div>
  if (error) return <div className="empty-state" role="alert">课程加载失败：{error}<button className="button" onClick={() => window.location.reload()}>重新加载</button></div>
  if (!chapters.length) return <div className="empty-state">暂时没有课程。</div>
  const last = readSaved('dorado:last-chapter')
  const next = chapters.find(ch => ch.slug === last && ch.progress_status !== 'locked' && ch.progress_status !== 'completed') || chapters.find(ch => ch.progress_status !== 'completed' && ch.progress_status !== 'locked') || chapters[0]
  const completed = chapters.filter(ch => ch.progress_status === 'completed').length
  return <div className="home-shell">
    <div className="eyebrow">LEARN BY DOING</div>
    <h1>把 Rust 写明白。</h1>
    <p className="muted intro">一个知识点，一道练习。随时开始，随时继续。</p>
    <Link className="quiet-link setup-entry" to="/setup">准备本机开发环境 <ArrowRight size={14} /></Link>
    <Link className="continue-row" to={'/chapter/' + next.slug}>
      <div><span className="eyebrow">{completed === chapters.length ? '回顾课程' : '接着练习'}</span><h2>{next.title}</h2><p>{next.subtitle}</p></div>
      <span className="primary button">进入练习 <ArrowRight size={17} /></span>
    </Link>
    <div className="section-heading"><h2>学习路径</h2><span className="muted">已完成 {completed} / {chapters.length} 章</span></div>
    <progress value={completed} max={chapters.length} aria-label="课程完成进度" />
    {[...new Set(chapters.map(ch => ch.stage))].map(stage => <section className="course-group" key={stage}>
      <h3>{String(stage).padStart(2, '0')} / {stage === 1 ? '语法基础' : '系统编程'}</h3>
      {chapters.filter(ch => ch.stage === stage).map(ch => {
        const locked = ch.progress_status === 'locked'
        const row = <><span className="course-number">{String(ch.order).padStart(2, '0')}</span><div className="course-copy"><strong>{ch.title}</strong><span>{ch.subtitle}</span></div><span className="course-status">{ch.progress_status === 'completed' ? <Check size={17} className="success" /> : locked ? <Lock size={15} /> : <ArrowRight size={17} />}</span></>
        return locked ? <div key={ch.id} className="course-row locked" title="完成前一章后解锁">{row}</div> : <Link className="course-row" key={ch.id} to={'/chapter/' + ch.slug}>{row}</Link>
      })}
    </section>)}
  </div>
}
