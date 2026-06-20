import type { GameState } from './GameState'
import type { CardSystem } from './CardSystem'
import type { BotAction } from './types'
import { Owner } from './types'
import { BOT_THINK_MIN_MS, BOT_THINK_MAX_MS, BOT_DEPLOY_ROW_MIN, BOT_DEPLOY_ROW_MAX, BRIDGE_COLS, GRID_COLS } from '@data/GameConstants'

export class BotAI {
  private thinkCooldownMs = BOT_THINK_MIN_MS

  tick(deltaMs: number, state: GameState, cardSystem: CardSystem): BotAction | null {
    this.thinkCooldownMs -= deltaMs
    if (this.thinkCooldownMs > 0) return null

    this.thinkCooldownMs = BOT_THINK_MIN_MS + Math.random() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS)

    // Find a playable card
    const playable = cardSystem.hand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.elixirCost <= state.botElixir)

    if (playable.length === 0) return null

    const chosen = playable[Math.floor(Math.random() * playable.length)]!

    // Pick a random deployment position in bot territory
    // Bias toward bridge columns to create natural lane pressure
    const useBridge = Math.random() < 0.6
    const col = useBridge
      ? BRIDGE_COLS[Math.floor(Math.random() * BRIDGE_COLS.length)]!
      : 1 + Math.floor(Math.random() * (GRID_COLS - 2))
    const row = BOT_DEPLOY_ROW_MIN + Math.floor(Math.random() * (BOT_DEPLOY_ROW_MAX - BOT_DEPLOY_ROW_MIN + 1))

    // Consume from bot's hand
    cardSystem.consumeCard(chosen.index)
    state.botElixir -= chosen.card.elixirCost

    return {
      cardId: chosen.card.id,
      position: { x: col, y: row },
    }
  }

  reset(): void {
    this.thinkCooldownMs = BOT_THINK_MIN_MS
  }
}

// Re-export Owner so callers don't need a separate import
export { Owner }
