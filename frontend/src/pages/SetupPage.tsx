import { useState, useEffect } from 'react'
import { Copy, Check, Download, RefreshCw } from 'lucide-react'
import { detectEnv, getInstallScript, type EnvDetection } from '../api'

interface ToolStatus {
  name: string
  installed: boolean
  version?: string
  label: string
}

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-green-400 text-sm">
      <Check className="w-4 h-4" /> 已安装
    </span>
  ) : (
    <span className="text-red-400 text-sm">未安装</span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 text-sm text-gray-400 hover:text-orange-400 transition-colors">
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      {copied ? '已复制' : '复制'}
    </button>
  )
}

export default function SetupPage() {
  const [env, setEnv] = useState<EnvDetection | null>(null)
  const [loading, setLoading] = useState(false)
  const [script, setScript] = useState('')
  const [scriptOs, setScriptOs] = useState('')
  const [scriptLoading, setScriptLoading] = useState(false)

  const handleDetect = async () => {
    setLoading(true)
    try {
      const data = await detectEnv()
      setEnv(data)
    } catch (e: any) {
      alert('检测失败: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGetScript = async (osType: string) => {
    setScriptLoading(true)
    try {
      const text = await getInstallScript(osType)
      setScript(text)
      setScriptOs(osType)
    } catch (e: any) {
      alert('获取脚本失败: ' + e.message)
    } finally {
      setScriptLoading(false)
    }
  }

  useEffect(() => { handleDetect() }, [])

  const tools: ToolStatus[] = env
    ? [
        { name: 'rustup', installed: !!env.rustup, version: env.rustup ?? undefined, label: 'rustup (工具链管理)' },
        { name: 'rustc', installed: !!env.rustc, version: env.rustc ?? undefined, label: 'rustc (编译器)' },
        { name: 'cargo', installed: !!env.cargo, version: env.cargo ?? undefined, label: 'cargo (包管理)' },
        { name: 'cc', installed: env.cc, label: 'C 编译器 (cc)' },
        { name: 'cmake', installed: env.cmake, label: 'cmake' },
        { name: 'pkg-config', installed: env.pkg_config, label: 'pkg-config' },
        { name: 'cargo-watch', installed: env.cargo_watch, label: 'cargo-watch (热重载)' },
        { name: 'cargo-nextest', installed: env.cargo_nextest, label: 'cargo-nextest (测试)' },
      ]
    : []

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">🛠 环境部署向导</h1>
      <p className="text-gray-400 mb-8">检测并配置你的 Rust 开发环境</p>

      {/* Detection results */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">环境检测</h2>
          <button
            onClick={handleDetect}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            重新检测
          </button>
        </div>

        {env && (
          <>
            <div className="mb-4 p-3 rounded-lg bg-gray-800">
              <span className="text-sm text-gray-400">系统: </span>
              <span className="text-gray-200">{env.os} ({env.arch})</span>
              <span className="mx-3 text-gray-600">|</span>
              <span className="text-sm text-gray-400">状态: </span>
              <span className={env.overall_status === 'ready' ? 'text-green-400' : env.overall_status === 'partial' ? 'text-yellow-400' : 'text-red-400'}>
                {env.overall_status === 'ready' ? '✅ 就绪' : env.overall_status === 'partial' ? '⚠️ 部分安装' : '❌ 未安装'}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {tools.map((t) => (
                <div key={t.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                  <div>
                    <span className="text-sm text-gray-200">{t.label}</span>
                    {t.version && <span className="ml-2 text-xs text-gray-500">{t.version}</span>}
                  </div>
                  <StatusBadge ok={t.installed} />
                </div>
              ))}
            </div>

            {env.toolchains && (
              <div className="mt-4 p-3 rounded-lg bg-gray-800/50">
                <span className="text-sm text-gray-400">已安装的 Toolchain: </span>
                <span className="text-sm text-gray-200">{env.toolchains}</span>
              </div>
            )}
          </>
        )}

        {loading && <p className="text-gray-400 text-center py-8">检测中...</p>}
      </div>

      {/* Install scripts */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">一键安装脚本</h2>
        <p className="text-sm text-gray-400 mb-4">选择你的操作系统，获取一键安装脚本：</p>

        <div className="flex flex-wrap gap-3 mb-4">
          {[
            { os: 'linux', label: 'Linux (Debian/Ubuntu)', icon: '🐧' },
            { os: 'darwin', label: 'macOS', icon: '🍎' },
          ].map(({ os, label, icon }) => (
            <button
              key={os}
              onClick={() => handleGetScript(os)}
              disabled={scriptLoading}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                scriptOs === os
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {script && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">安装脚本 ({scriptOs})</span>
              <CopyButton text={script} />
            </div>
            <pre className="p-4 rounded-lg bg-gray-900 border border-gray-700 text-sm text-gray-300 overflow-x-auto max-h-96 overflow-y-auto">
              {script}
            </pre>
            <p className="text-xs text-gray-500 mt-2">
              复制上面的脚本，在终端中执行。或者直接在终端运行：
              <code className="ml-1 text-orange-300">curl -sSL http://localhost:8500/api/env/install-script/{scriptOs} | bash</code>
            </p>
          </div>
        )}
      </div>

      {/* IDE recommendations */}
      <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
        <h2 className="text-lg font-semibold mb-4">推荐编辑器配置</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
            <h3 className="font-medium mb-2">VS Code (推荐新手)</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• 安装 <span className="text-orange-300">rust-analyzer</span> 扩展</li>
              <li>• 安装 <span className="text-orange-300">Even Better TOML</span></li>
              <li>• 安装 <span className="text-orange-300">Error Lens</span></li>
              <li>• 设置 <code className="text-xs bg-gray-700 px-1 rounded">check.command: "clippy"</code></li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
            <h3 className="font-medium mb-2">Neovim (进阶)</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• 配置 rust-analyzer LSP</li>
              <li>• 安装 nvim-cmp 自动补全</li>
              <li>• 配置 rustfmt on save</li>
              <li>• 安装 crates.nvim 管理依赖</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
