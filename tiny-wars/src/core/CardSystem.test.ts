import { describe, it, expect } from 'vitest'
import { CardSystem } from './CardSystem'
import { DEFAULT_DECK } from '@data/CardData'

describe('CardSystem', () => {
  it('starts with 4 cards in hand and a next card', () => {
    const cs = new CardSystem()
    expect(cs.hand).toHaveLength(4)
    expect(cs.nextCard).toBeDefined()
  })

  it('DEFAULT_DECK has 8 unique cards', () => {
    expect(DEFAULT_DECK).toHaveLength(8)
    expect(new Set(DEFAULT_DECK).size).toBe(8)
  })

  it('DEFAULT_DECK has no duplicate card ids', () => {
    expect(new Set(DEFAULT_DECK).size).toBe(DEFAULT_DECK.length)
  })

  it('opening hand and next card are all unique', () => {
    for (let i = 0; i < 20; i++) {
      const cs = new CardSystem()
      const visible = [...cs.hand, cs.nextCard].map(c => c.id)
      expect(new Set(visible).size).toBe(visible.length)
    }
  })

  it('rejects decks with duplicate card ids', () => {
    expect(() => new CardSystem(['pawn', 'pawn', 'archer'])).toThrow(/duplicate/i)
  })

  it('consumeCard shifts next card into hand and draws a new next', () => {
    const cs = new CardSystem(DEFAULT_DECK)
    const slotBefore = cs.hand[0]
    const nextBefore = cs.nextCard
    const played = cs.consumeCard(0)
    expect(played).toBe(slotBefore)
    expect(cs.hand[0]).toBe(nextBefore)
    expect(cs.nextCard).not.toBe(nextBefore)
    expect(cs.hand).toHaveLength(4)
  })

  it('played card goes to the back of the queue, not the immediate next draw', () => {
    const cs = new CardSystem(DEFAULT_DECK)
    const played = cs.consumeCard(0)
    expect(cs.nextCard).not.toBe(played)
  })

  it('played card reappears as next after the rest of the queue is drawn', () => {
    const cs = new CardSystem(DEFAULT_DECK)
    const playedId = cs.consumeCard(0).id
    for (let i = 0; i < DEFAULT_DECK.length - 5; i++) cs.consumeCard(0)
    expect(cs.nextCard.id).toBe(playedId)
  })

  it('shuffles deck so the opening hand varies between matches', () => {
    const openingHands = new Set<string>()
    for (let i = 0; i < 24; i++) {
      const cs = new CardSystem(DEFAULT_DECK)
      openingHands.add(cs.hand.map(c => c.id).join(','))
    }
    expect(openingHands.size).toBeGreaterThan(1)
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
