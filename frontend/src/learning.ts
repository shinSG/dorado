import type { Chapter } from './api'

export function readSaved(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function save(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true } catch { return false }
}

export function availableChapters(chapters: Chapter[]): Chapter[] {
  const completed = new Set(chapters.filter(ch => ch.progress_status === 'completed').map(ch => ch.slug))
  return chapters.map(ch => ({ ...ch, progress_status: ch.progress_status === 'locked' && (!ch.unlock_after || completed.has(ch.unlock_after)) ? 'unlocked' : ch.progress_status }))
}
