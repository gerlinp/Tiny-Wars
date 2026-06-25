import type { CardDefinition } from './types'
import { CARD_DEFINITIONS, DEFAULT_DECK } from '@data/CardData'

export interface HandState {
  hand: CardDefinition[]     // 4 visible cards
  nextCard: CardDefinition   // card shown as coming next
  selectedIndex: number | null
}

export class CardSystem {
  /** Draw pile — front is dealt next; played cards return to the back. */
  private queue: CardDefinition[]

  hand: CardDefinition[]
  nextCard: CardDefinition
  selectedIndex: number | null = null

  constructor(deckIds: string[] = DEFAULT_DECK) {
    if (new Set(deckIds).size !== deckIds.length) {
      throw new Error(`Deck contains duplicate card ids: ${deckIds.join(', ')}`)
    }
    const definitions = deckIds.map(id => {
      const def = CARD_DEFINITIONS[id]
      if (!def) throw new Error(`Unknown card id: ${id}`)
      return def
    })
    this.queue = [...definitions]
    shuffleInPlace(this.queue)

    this.hand = []
    for (let i = 0; i < 4; i++) this.hand.push(this.queue.shift()!)
    this.nextCard = this.queue.shift()!
  }

  /** Play hand[slot]: next slides in, played card goes to the back of the queue. */
  consumeCard(handIndex: number): CardDefinition {
    const played = this.hand[handIndex]!
    this.hand[handIndex] = this.nextCard
    this.queue.push(played)
    this.nextCard = this.queue.shift()!
    this.selectedIndex = null
    return played
  }

  selectCard(index: number): void {
    this.selectedIndex = this.selectedIndex === index ? null : index
  }

  get selectedCard(): CardDefinition | null {
    if (this.selectedIndex === null) return null
    return this.hand[this.selectedIndex] ?? null
  }

  get snapshot(): HandState {
    return {
      hand: [...this.hand],
      nextCard: this.nextCard,
      selectedIndex: this.selectedIndex,
    }
  }
}

/** Fisher–Yates shuffle — randomizes draw order each match. */
function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = items[i]!
    items[i] = items[j]!
    items[j] = tmp
  }
}
