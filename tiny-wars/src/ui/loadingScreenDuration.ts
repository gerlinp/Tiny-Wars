/** Minimum time the loading screen stays visible (startup + pre-battle). */
export const MIN_LOADING_MS = 2000

/** Pre-battle transition — matches minimum loading duration. */
export const BATTLE_LOADING_MS = MIN_LOADING_MS

export function loadingWaitMs(elapsedMs: number): number {
  return Math.max(0, MIN_LOADING_MS - elapsedMs)
}

/** Bar fill 0–1 from elapsed time (reaches 100% at MIN_LOADING_MS). */
export function loadingBarProgress(elapsedMs: number): number {
  return Math.min(1, elapsedMs / MIN_LOADING_MS)
}
