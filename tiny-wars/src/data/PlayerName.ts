const STORAGE_KEY = 'tinywars.playerName'

/** Max length matches the lobby name input. */
export const PLAYER_NAME_MAX = 14

/** Load the saved player name, or '' when none was ever entered. */
export function loadPlayerName(): string {
  try {
    return (globalThis.localStorage?.getItem(STORAGE_KEY) ?? '').trim().slice(0, PLAYER_NAME_MAX)
  } catch {
    return ''
  }
}

export function savePlayerName(name: string): void {
  try {
    const trimmed = name.trim().slice(0, PLAYER_NAME_MAX)
    if (trimmed) {
      globalThis.localStorage?.setItem(STORAGE_KEY, trimmed)
    } else {
      globalThis.localStorage?.removeItem(STORAGE_KEY)
    }
  } catch {
    /* storage unavailable (private mode / SSR) — name just won't persist */
  }
}
