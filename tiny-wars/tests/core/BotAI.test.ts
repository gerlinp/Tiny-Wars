import { describe, it, expect } from 'vitest'
import { Grid } from '@core/Grid'
import { GameSimulator } from '@core/GameSimulator'
import { CardSystem } from '@core/CardSystem'
import { BotAI } from '@core/BotAI'
import { Owner, CardType } from '@core/types'
import { CARD_DEFINITIONS, DECK_EXCLUDED_CARD_IDS } from '@data/CardData'
import { BOT_DECKS, BOT_DIFFICULTIES } from '@data/BotDecks'
import { DECK_SIZE } from '@data/PlayerDeck'
import {
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  BOT_DEPLOY_ROW_MAX,
} from '@data/GameConstants'

function makeSim() {
  return new GameSimulator(new Grid())
}

/** Force a specific hand so bot decisions are deterministic. */
function handOf(cardSystem: CardSystem, ids: string[]): void {
  cardSystem.hand = ids.map(id => CARD_DEFINITIONS[id]!)
}

/** Put a player troop on the bot's half (legal deploy, then walk it across). */
function invade(sim: GameSimulator, cardId: string, cell: { x: number; y: number }): void {
  sim.state.playerElixir = 10
  const ok = sim.deployCard(Owner.PLAYER, CARD_DEFINITIONS[cardId]!, { x: cell.x, y: 18 })
  expect(ok).toBe(true)
  for (const e of sim.state.entities.values()) {
    if (e.owner === Owner.PLAYER) {
      e.position = { x: cell.x * CELL_SIZE + 25, y: cell.y * CELL_SIZE + 25 }
    }
  }
}

describe('BOT_DECKS', () => {
  it('every difficulty has a full deck of unique, existing, allowed cards', () => {
    for (const difficulty of BOT_DIFFICULTIES) {
      const deck = BOT_DECKS[difficulty]
      expect(deck).toHaveLength(DECK_SIZE)
      expect(new Set(deck).size).toBe(deck.length)
      for (const id of deck) {
        expect(CARD_DEFINITIONS[id], `${difficulty} deck card ${id}`).toBeDefined()
        expect(DECK_EXCLUDED_CARD_IDS as readonly string[]).not.toContain(id)
      }
    }
  })
})

describe('BotAI', () => {
  it('waits out its think cooldown before acting', () => {
    const sim = makeSim()
    const bot = new BotAI('EASY')
    const cards = new CardSystem(BOT_DECKS.EASY)
    sim.state.botElixir = 10
    expect(bot.tick(100, sim.state, cards)).toBeNull()
  })

  it('EASY plays a card it can afford at a cell inside the grid', () => {
    const sim = makeSim()
    const bot = new BotAI('EASY')
    const cards = new CardSystem(BOT_DECKS.EASY)
    sim.state.botElixir = 10
    const action = bot.tick(10_000, sim.state, cards)
    expect(action).not.toBeNull()
    const card = CARD_DEFINITIONS[action!.cardId]!
    expect(card.elixirCost).toBeLessThanOrEqual(10)
    expect(action!.position.x).toBeGreaterThanOrEqual(0)
    expect(action!.position.x).toBeLessThan(GRID_COLS)
    expect(action!.position.y).toBeGreaterThanOrEqual(0)
    expect(action!.position.y).toBeLessThan(GRID_ROWS)
    if (card.cardType === CardType.TROOP) {
      expect(action!.position.y).toBeLessThanOrEqual(BOT_DEPLOY_ROW_MAX)
    }
  })

  it('HARD banks elixir instead of leaking cheap plays when unthreatened', () => {
    const sim = makeSim()
    const bot = new BotAI('HARD')
    const cards = new CardSystem(BOT_DECKS.HARD)
    sim.state.botElixir = 5
    expect(bot.tick(10_000, sim.state, cards)).toBeNull()
  })

  it('HARD defends its own half instead of banking when invaded', () => {
    const sim = makeSim()
    const bot = new BotAI('HARD')
    const cards = new CardSystem(BOT_DECKS.HARD)
    handOf(cards, ['warrior', 'elite_archer', 'skeleton', 'bear'])
    invade(sim, 'warrior', { x: 4, y: 10 })
    sim.state.botElixir = 5
    const action = bot.tick(10_000, sim.state, cards)
    expect(action).not.toBeNull()
    // Defender lands on the bot's half, in the invader's lane, behind the threat.
    expect(action!.position.y).toBeLessThanOrEqual(BOT_DEPLOY_ROW_MAX)
    expect(action!.position.y).toBeLessThan(10)
    expect(Math.abs(action!.position.x - 4)).toBeLessThanOrEqual(2)
  })

  it('HARD answers a swarm with a splash troop', () => {
    const sim = makeSim()
    const bot = new BotAI('HARD')
    const cards = new CardSystem(BOT_DECKS.HARD)
    handOf(cards, ['skeleton', 'torch_goblin', 'bear', 'elite_archer'])
    invade(sim, 'skeleton_army', { x: 13, y: 11 })
    sim.state.botElixir = 10
    const action = bot.tick(10_000, sim.state, cards)
    expect(action).not.toBeNull()
    expect(action!.cardId).toBe('torch_goblin')
  })

  it('HARD finishes a near-dead tower with a spell', () => {
    const sim = makeSim()
    const bot = new BotAI('HARD')
    const cards = new CardSystem(BOT_DECKS.HARD)
    handOf(cards, ['arrows', 'skeleton', 'warrior', 'bear'])
    sim.state.botElixir = 10
    const princess = [...sim.state.towers.values()].find(
      t => t.owner === Owner.PLAYER && !t.isKing,
    )!
    princess.hp = 50 // below arrows' 404 damage
    const action = bot.tick(10_000, sim.state, cards)
    expect(action).not.toBeNull()
    expect(action!.cardId).toBe('arrows')
    expect(action!.position.x).toBe(Math.floor(princess.position.x / CELL_SIZE))
    expect(action!.position.y).toBe(Math.floor(princess.position.y / CELL_SIZE))
  })

  it('HARD opens a push with its heaviest troop from the back', () => {
    const sim = makeSim()
    const bot = new BotAI('HARD')
    const cards = new CardSystem(BOT_DECKS.HARD)
    handOf(cards, ['bear', 'skeleton', 'torch_goblin', 'elite_archer'])
    sim.state.botElixir = 10
    const action = bot.tick(10_000, sim.state, cards)
    expect(action).not.toBeNull()
    expect(action!.cardId).toBe('bear')
    expect(action!.position.y).toBeLessThanOrEqual(4)
  })
})
