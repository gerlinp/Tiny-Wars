import { describe, it, expect } from 'vitest'
import { loadingWalkerCandidates, pickRandomLoadingUnitId } from '@ui/loadingScreenUnitPick'
import { CARD_DEFINITIONS } from '@data/CardData'
import { CardType } from '@core/types'

describe('loadingScreenUnit', () => {
  it('only picks animated troops', () => {
    const candidates = loadingWalkerCandidates()
    expect(candidates.length).toBeGreaterThan(0)
    for (const id of candidates) {
      expect(CARD_DEFINITIONS[id]?.cardType).toBe(CardType.TROOP)
    }
    expect(candidates).not.toContain('arrows')
    expect(candidates).not.toContain('wood_tower')
    expect(candidates).not.toContain('big_bomb')
  })

  it('pickRandomLoadingUnitId returns a valid candidate', () => {
    const candidates = new Set(loadingWalkerCandidates())
    for (let i = 0; i < 20; i++) {
      expect(candidates.has(pickRandomLoadingUnitId())).toBe(true)
    }
  })
})
