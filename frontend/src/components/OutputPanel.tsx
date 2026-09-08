import { useState } from 'react'

export default function OutputPanel({ stdout, stderr, feedback }: { stdout: string; stderr: string; feedback?: string }) {
  const [tab, setTab] = useState(feedback ? 'feedback' : stderr ? 'error' : 'output')
  const content = tab === 'feedback' ? feedback : tab === 'error' ? stderr : stdout
  return <section className="output-panel" aria-label="执行结果">
    <div className="tabbar" role="tablist" aria-label="结果分类">
      {[...(feedback ? [['feedback', '评测结果']] : []), ['output', '运行输出'], ['error', '错误信息']].map(([key, label]) =>
        <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={tab === key ? 'active' : ''}>{label}</button>)}
    </div>
    <pre role="tabpanel">{content || (tab === 'error' ? '没有错误信息' : '没有输出')}</pre>
  </section>
}
