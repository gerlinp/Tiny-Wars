import type { GameState } from './GameState'
import type { CardSystem } from './CardSystem'
import type { BotAction } from './types'
import { Owner } from './types'
import { CardType } from './types'
import { BOT_THINK_MIN_MS, BOT_THINK_MAX_MS } from '@data/GameConstants'
import { listTroopDeployCells } from './DeployZones'

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
    const card = chosen.card

    let col: number
    let row: number
    if (card.cardType === CardType.ELIXIR || card.cardType === CardType.SPELL) {
      col = Math.floor(Math.random() * 24)
      row = Math.floor(Math.random() * 43)
    } else {
      const cells = listTroopDeployCells(Owner.BOT, state.enemyLaneDeploy)
      if (cells.length === 0) return null
      const pick = cells[Math.floor(Math.random() * cells.length)]!
      col = pick.x
      row = pick.y
    }

    // Card is consumed by BattleScene only after a successful deploy (matches player flow).
    return {
      cardId: card.id,
      handIndex: chosen.index,
      position: { x: col, y: row },
    }
  }

  reset(): void {
    this.thinkCooldownMs = BOT_THINK_MIN_MS
  }
}

// Re-export Owner so callers don't need a separate import
export { Owner }
