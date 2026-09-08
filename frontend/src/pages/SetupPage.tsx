import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Copy, Download, RefreshCw } from 'lucide-react'
import { detectEnv, getInstallScript, type EnvDetection } from '../api'

const systems = [{ value: 'darwin', label: 'macOS' }, { value: 'linux', label: 'Debian / Ubuntu' }]
const verifyCommand = 'rustc --version\ncargo --version\nrustup show\n\n# 在临时目录验证编译和运行，不覆盖已有项目\ndorado_check_dir="$(mktemp -d)" && cargo new --name dorado_check "$dorado_check_dir/check" && cargo run --manifest-path "$dorado_check_dir/check/Cargo.toml"'

function CopyButton({ text, label = '复制' }: { text: string; label?: string }) {
  const [status, setStatus] = useState('')
  async function copy() {
    try { await navigator.clipboard.writeText(text); setStatus('已复制') }
    catch { setStatus('复制失败，请手动选择下方文本') }
  }
  return <span className="copy-control"><button className="button" onClick={() => void copy()}><Copy size={14} />{label}</button><span role="status" className="muted">{status}</span></span>
}

export default function SetupPage() {
  const [os, setOs] = useState('')
  const [step, setStep] = useState(1)
  const [script, setScript] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [env, setEnv] = useState<EnvDetection | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState('')
  const [checkedAt, setCheckedAt] = useState('')
  const filename = 'dorado-setup-' + os + '.sh'
  const command = 'bash ' + filename

  async function prepare() {
    setLoading(true)
    setError('')
    try {
      const text = await getInstallScript(os)
      if (!text.trim().startsWith('#!')) throw new Error('服务未返回有效安装脚本，请检查后端连接。')
      setScript(text)
      setStep(2)
    } catch (e) { setError('无法获取安装脚本，请确认后端服务已启动后重试。' + (e instanceof Error ? '（' + e.message + '）' : '')) }
    finally { setLoading(false) }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([script], { type: 'text/x-shellscript;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function detect() {
    setDetecting(true)
    setDetectError('')
    setEnv(null)
    try {
      const data = await detectEnv()
      if (!['ready', 'partial', 'missing'].includes(data.overall_status)) throw new Error('服务端检测未完成，请稍后重试。')
      setEnv(data)
      setCheckedAt(new Date().toLocaleTimeString())
    } catch (e) { setDetectError(e instanceof Error ? e.message : '检测失败，请重试') }
    finally { setDetecting(false) }
  }

  return <div className="setup-shell">
    <div className="eyebrow">LOCAL DEVELOPMENT</div>
    <h1>准备好你的 Rust 环境。</h1>
    <p className="setup-intro">选择系统，获取安装脚本，在自己的电脑上开始实践。在线练习无需安装。</p>
    <nav className="setup-steps" aria-label="部署步骤">
      {['选择方案', '执行安装', '验证结果'].map((label, index) => <button key={label} aria-current={step === index + 1 ? 'step' : undefined} disabled={index > 0 && !script} onClick={() => setStep(index + 1)}><span>{index + 1}</span>{label}</button>)}
    </nav>
    <section className="setup-content" aria-labelledby="setup-step-title">
      {step === 1 && <>
        <h2 id="setup-step-title">安装到哪台电脑？</h2>
        <p className="muted">选择目标电脑的系统，不一定是 Dorado 服务所在机器。</p>
        <fieldset className="system-options" disabled={loading}>
          <legend className="sr-only">目标操作系统</legend>
          {systems.map(system => <label key={system.value} className={os === system.value ? 'selected' : ''}><input type="radio" name="system" value={system.value} checked={os === system.value} onChange={() => { setOs(system.value); setScript(''); setError('') }} />{system.label}</label>)}
        </fieldset>
        <p className="muted">其他系统暂不提供安装脚本。</p>
        <div className="setup-profile"><div><strong>现有完整工具方案</strong><p>Rust 工具链、代码检查与项目辅助工具。</p></div><span className="muted">当前可用</span></div>
        <details className="setup-details"><summary>查看安装内容与环境调整</summary>
          <ul><li>安装系统编译依赖和 rustup（尚未安装时）。</li><li>将默认工具链设为 stable，另行安装 nightly。</li><li>添加 rust-src、rust-analyzer、clippy 和 rustfmt。</li><li>尝试安装 cargo-watch、cargo-nextest 和 cargo-edit。</li></ul>
          <p>执行时可能需要管理员密码。当前脚本包含上述全部工具；精简方案与可选组件将在后续提供。</p>
        </details>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="setup-actions"><button className="button primary" disabled={!os || loading} onClick={() => void prepare()}>{loading ? '正在获取…' : '获取安装脚本'}<ArrowRight size={15} /></button><Link className="quiet-link" to="/">先去在线练习</Link></div>
      </>}
      {step === 2 && <>
        <h2 id="setup-step-title">在目标电脑终端执行</h2>
        <p className="muted">{systems.find(system => system.value === os)?.label} · 现有完整工具方案</p>
        <ol className="installation-list"><li>下载安装脚本，或展开预览检查具体内容。</li><li>在脚本所在文件夹打开终端，执行下方命令。</li><li>根据终端提示完成安装，再进入验证步骤。</li></ol>
        <div className="setup-actions"><button className="button primary" onClick={download}><Download size={15} />下载脚本</button><CopyButton text={command} label="复制执行命令" /></div>
        <pre className="setup-code">{command}</pre>
        <details className="setup-details"><summary>预览安装脚本</summary><pre className="setup-code">{script}</pre><CopyButton text={script} label="复制脚本" /></details>
        <p className="setup-note">安装日志显示在目标电脑的终端中。网页不会自动执行脚本或判断安装是否完成。若 macOS 弹出开发工具安装窗口，请先完成安装，再按终端提示继续。</p>
        <div className="setup-actions"><button className="button" onClick={() => setStep(3)}>查看验证步骤<ArrowRight size={15} /></button><button className="quiet-link" onClick={() => setStep(1)}>修改系统</button></div>
      </>}
      {step === 3 && <>
        <h2 id="setup-step-title">确认能编译，也能运行</h2>
        <p className="muted">在目标电脑新开一个终端，执行以下命令。看到版本信息与 Hello, world!，说明基础编译运行验证成功。</p>
        <pre className="setup-code">{verifyCommand}</pre>
        <CopyButton text={verifyCommand} label="复制验证命令" />
        <details className="setup-details"><summary>验证遇到问题？</summary><ul><li>找不到 cargo 或 rustc：新开终端，或执行 source "$HOME/.cargo/env" 后重试。</li><li>链接器或编译工具缺失：先完成系统开发工具安装，再重新验证。</li><li>下载失败：查看终端网络错误，恢复连接后重试；可选工具的安装状态也需要单独检查。</li></ul></details>
        <div className="setup-actions"><Link className="button primary" to="/">返回学习<ArrowRight size={15} /></Link><button className="quiet-link" onClick={() => setStep(2)}>返回安装步骤</button></div>
      </>}
    </section>
    <details className="server-check">
      <summary>查看 Dorado 服务所在机器的环境</summary>
      <p className="setup-note">此检测只运行于后端机器，不代表当前浏览器所在电脑，也不验证安装脚本的执行结果。</p>
      <button className="button" disabled={detecting} onClick={() => void detect()}><RefreshCw size={14} />{detecting ? '检测中…' : '检测服务端环境'}</button>
      {detectError && <p className="error-message" role="alert">{detectError}</p>}
      {env && <div className="server-report" aria-live="polite"><p>{env.os || '未知系统'} · {env.arch || '未知架构'} <span className="muted">检测于 {checkedAt}</span></p>
        <p className="muted">仅展示工具检测结果，未验证项目编译运行。</p>
        {([['rustup', env.rustup], ['rustc', env.rustc], ['cargo', env.cargo]] as const).map(([name, version]) => <div className="server-tool" key={name}><strong>{name}</strong><span>{version || '未检测到'}</span>{version && <Check size={14} className="success" />}</div>)}
      </div>}
    </details>
  </div>
}
