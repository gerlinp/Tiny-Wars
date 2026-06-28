import { describe, it, expect } from 'vitest'
import { MIN_LOADING_MS, BATTLE_LOADING_MS, loadingBarProgress, loadingWaitMs } from '@ui/loadingScreenDuration'

describe('loadingScreenDuration', () => {
  it('enforces a 2 second minimum loading duration', () => {
    expect(MIN_LOADING_MS).toBe(2000)
    expect(BATTLE_LOADING_MS).toBe(MIN_LOADING_MS)
  })

  it('loadingWaitMs returns remaining time until the minimum elapses', () => {
    expect(loadingWaitMs(0)).toBe(2000)
    expect(loadingWaitMs(500)).toBe(1500)
    expect(loadingWaitMs(2000)).toBe(0)
    expect(loadingWaitMs(5000)).toBe(0)
  })

  it('loadingBarProgress fills linearly over MIN_LOADING_MS', () => {
    expect(loadingBarProgress(0)).toBe(0)
    expect(loadingBarProgress(1000)).toBe(0.5)
    expect(loadingBarProgress(2000)).toBe(1)
    expect(loadingBarProgress(3000)).toBe(1)
  })
})
