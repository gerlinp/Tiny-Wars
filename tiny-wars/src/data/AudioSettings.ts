const MUSIC_KEY = 'tinywars.musicVolume'
const SFX_KEY = 'tinywars.sfxVolume'

const DEFAULT_MUSIC_VOLUME = 0.6
const DEFAULT_SFX_VOLUME = 1

function loadVolume(key: string, fallback: number): number {
  try {
    const raw = globalThis.localStorage?.getItem(key)
    if (raw === null || raw === undefined) return fallback
    const value = Number(raw)
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback
  } catch {
    return fallback
  }
}

function saveVolume(key: string, value: number): void {
  try {
    globalThis.localStorage?.setItem(key, String(Math.min(1, Math.max(0, value))))
  } catch {
    /* storage unavailable (private mode / SSR) — volume just won't persist */
  }
}

export function loadMusicVolume(): number {
  return loadVolume(MUSIC_KEY, DEFAULT_MUSIC_VOLUME)
}

export function saveMusicVolume(value: number): void {
  saveVolume(MUSIC_KEY, value)
}

export function loadSfxVolume(): number {
  return loadVolume(SFX_KEY, DEFAULT_SFX_VOLUME)
}

export function saveSfxVolume(value: number): void {
  saveVolume(SFX_KEY, value)
}
