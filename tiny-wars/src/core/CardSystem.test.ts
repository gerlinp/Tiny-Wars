import { describe, it, expect } from 'vitest'
import { CardSystem } from './CardSystem'
import { DEFAULT_DECK } from '@data/CardData'

describe('CardSystem', () => {
  it('starts with 4 cards in hand and a next card', () => {
    const cs = new CardSystem()
    expect(cs.hand).toHaveLength(4)
    expect(cs.nextCard).toBeDefined()
  })

  it('consumeCard shifts next card into hand and draws a new next', () => {
    const cs = new CardSystem()
    const originalNext = cs.nextCard
    const original0 = cs.hand[0]
    cs.consumeCard(0)
    expect(cs.hand[0]).toBe(originalNext)
    expect(cs.hand[0]).not.toBe(original0)
    expect(cs.nextCard).toBeDefined()
  })

  it('cycles through deck cards', () => {
    const cs = new CardSystem(DEFAULT_DECK)
    // Consume all 8 hand/next slots to cycle the deck
    for (let i = 0; i < 8; i++) cs.consumeCard(0)
    // Should still have a valid hand
    expect(cs.hand).toHaveLength(4)
  })

  it('selectedCard returns null when nothing selected', () => {
    const cs = new CardSystem()
    expect(cs.selectedCard).toBeNull()
  })

  it('selectCard toggles selection', () => {
    const cs = new CardSystem()
    cs.selectCard(1)
    expect(cs.selectedIndex).toBe(1)
    cs.selectCard(1)
    expect(cs.selectedIndex).toBeNull()
  })
})
