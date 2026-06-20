import type { CardDefinition } from './types'
import { CARD_DEFINITIONS, DEFAULT_DECK } from '@data/CardData'

export interface HandState {
  hand: CardDefinition[]     // 4 visible cards
  nextCard: CardDefinition   // card shown as coming next
  selectedIndex: number | null
}

export class CardSystem {
  private deck: CardDefinition[]
  private drawIndex: number

  hand: CardDefinition[]
  nextCard: CardDefinition
  selectedIndex: number | null = null

  constructor(deckIds: string[] = DEFAULT_DECK) {
    // Build deck from ids, cycling through the provided list
    const definitions = deckIds.map(id => {
      const def = CARD_DEFINITIONS[id]
      if (!def) throw new Error(`Unknown card id: ${id}`)
      return def
    })
    this.deck = [...definitions]
    this.drawIndex = 0

    // Deal initial 4-card hand + next
    this.hand = []
    for (let i = 0; i < 4; i++) this.hand.push(this.draw())
    this.nextCard = this.draw()
  }

  private draw(): CardDefinition {
    const card = this.deck[this.drawIndex % this.deck.length]!
    this.drawIndex++
    return card
  }

  /** Remove the card at handIndex, shift nextCard in, draw new nextCard */
  consumeCard(handIndex: number): CardDefinition {
    const card = this.hand[handIndex]!
    this.hand[handIndex] = this.nextCard
    this.nextCard = this.draw()
    this.selectedIndex = null
    return card
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
