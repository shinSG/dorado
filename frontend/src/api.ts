const BASE = '/api'

// --- Auth ---
const TOKEN_KEY = 'dorado_token'
const USER_KEY = 'dorado_user'

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setAuth(token: string, user: { user_id: number; username: string; display_name: string }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser(): { user_id: number; username: string; display_name: string } | null {
  const s = localStorage.getItem(USER_KEY)
  return s ? JSON.parse(s) : null
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// --- Types ---
export interface Chapter {
  id: number; stage: number; order: number; slug: string; title: string; subtitle: string
  unlock_after: string | null; progress_status: 'locked' | 'unlocked' | 'in_progress' | 'completed'
}

export interface Exercise {
  id: number; order: number; type: string; title: string; description: string
  template_code: string; hint: string; passed: boolean
}

export interface ChapterDetail extends Chapter { content: string; exercises: Exercise[] }
export interface RunResult { stdout: string; stderr: string; exit_code: number; timed_out: boolean }
export interface SubmitResult { passed: boolean; stdout: string; stderr: string; submission_id: number }

export interface EnvDetection {
  os: string | null; arch: string | null; rustup: string | null; rustc: string | null
  cargo: string | null; toolchains: string | null; components: string | null
  cargo_watch: boolean; cargo_nextest: boolean; lld_available: boolean
  cc: boolean; cmake: boolean; pkg_config: boolean; overall_status: string
}

export interface AuthResponse {
  token: string; user_id: number; username: string; display_name: string
}

// --- API calls ---
export async function fetchChapters(): Promise<Chapter[]> {
  const uid = getUser()?.user_id
  const url = uid ? `${BASE}/chapters?user_id=${uid}` : `${BASE}/chapters`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchChapter(slug: string): Promise<ChapterDetail> {
  const uid = getUser()?.user_id
  const url = uid ? `${BASE}/chapters/${slug}?user_id=${uid}` : `${BASE}/chapters/${slug}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function runCode(code: string, edition = '2021'): Promise<RunResult> {
  const res = await fetch(`${BASE}/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ code, edition }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function submitExercise(exerciseId: number, code: string): Promise<SubmitResult> {
  const uid = getUser()?.user_id || 'local'
  const res = await fetch(`${BASE}/submit?user_id=${uid}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ exercise_id: exerciseId, code }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function updateProgress(chapterId: number, status: string): Promise<void> {
  const uid = getUser()?.user_id || 'local'
  await fetch(`${BASE}/progress?user_id=${uid}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ chapter_id: chapterId, status }),
  })
}

export async function detectEnv(): Promise<EnvDetection> {
  const res = await fetch(`${BASE}/env/detect`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getInstallScript(osType: string): Promise<string> {
  const res = await fetch(`${BASE}/env/install-script/${osType}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

export async function register(username: string, password: string, displayName?: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, display_name: displayName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function getStats(): Promise<{ chapters: number; exercises: number; submissions: number; pass_rate: number }> {
  const res = await fetch(`${BASE}/stats`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
