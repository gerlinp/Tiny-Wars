import type { GameState } from './GameState'
import { createInitialGameState } from './GameState'
import type { Grid } from './Grid'
import { tickElixir } from './ElixirSystem'
import { resolveDeaths, checkTimeWin } from './CombatSystem'
import { Troop } from './entities/Troop'
import { Tower } from './entities/Tower'
import { Building } from './entities/Building'
import { Spell } from './entities/Spell'
import { Owner, CardType } from './types'
import type { Vec2 } from './types'
import type { CardDefinition, SpellStats, EntityStats } from './types'
import { CELL_SIZE, PLAYER_DEPLOY_ROW_MIN, BOT_DEPLOY_ROW_MAX } from '@data/GameConstants'
import { KING_TOWER, PRINCESS_TOWER } from '@data/TowerData'
import {
  PLAYER_KING_ROW, PLAYER_KING_COL, PLAYER_TOWER_ROW, PLAYER_TOWER_COLS,
  BOT_KING_ROW, BOT_KING_COL, BOT_TOWER_ROW, BOT_TOWER_COLS,
} from '@data/GameConstants'

export class GameSimulator {
  state: GameState

  constructor(private grid: Grid) {
    this.state = createInitialGameState()
    this.placeTowers()
  }

  private placeTowers(): void {
    const place = (owner: Owner, def: typeof KING_TOWER, col: number, row: number) => {
      const pos: Vec2 = {
        x: col * CELL_SIZE + CELL_SIZE / 2,
        y: row * CELL_SIZE + CELL_SIZE / 2,
      }
      const tower = new Tower(owner, def, pos)
      this.state.towers.set(tower.id, tower)
    }

    place(Owner.PLAYER, KING_TOWER,     PLAYER_KING_COL, PLAYER_KING_ROW)
    for (const col of PLAYER_TOWER_COLS) {
      place(Owner.PLAYER, PRINCESS_TOWER, col, PLAYER_TOWER_ROW)
    }

    place(Owner.BOT, KING_TOWER,     BOT_KING_COL, BOT_KING_ROW)
    for (const col of BOT_TOWER_COLS) {
      place(Owner.BOT, PRINCESS_TOWER, col, BOT_TOWER_ROW)
    }
  }

  tick(deltaMs: number): GameState {
    if (this.state.phase === 'ENDED') return this.state

    this.state.events = []
    this.state.tick++
    this.state.elapsedMs += deltaMs

    tickElixir(this.state, deltaMs)

    for (const entity of this.state.entities.values()) {
      entity.tick(deltaMs, this.state)
    }

    for (const tower of this.state.towers.values()) {
      tower.tick(deltaMs, this.state)
    }

    resolveDeaths(this.state)
    checkTimeWin(this.state, this.state.elapsedMs)

    return this.state
  }

  deployCard(owner: Owner, card: CardDefinition, gridPos: Vec2): boolean {
    // Validate placement zone
    if (owner === Owner.PLAYER && gridPos.y < PLAYER_DEPLOY_ROW_MIN) return false
    if (owner === Owner.BOT    && gridPos.y > BOT_DEPLOY_ROW_MAX)    return false

    // Validate walkability (spells can land anywhere in zone)
    if (card.cardType !== CardType.SPELL && !this.grid.isWalkable(gridPos.x, gridPos.y)) return false

    // Validate elixir
    const elixir = owner === Owner.PLAYER ? this.state.playerElixir : this.state.botElixir
    if (elixir < card.elixirCost) return false

    // Deduct elixir
    if (owner === Owner.PLAYER) this.state.playerElixir -= card.elixirCost
    else                        this.state.botElixir    -= card.elixirCost

    const worldPos: Vec2 = {
      x: gridPos.x * CELL_SIZE + CELL_SIZE / 2,
      y: gridPos.y * CELL_SIZE + CELL_SIZE / 2,
    }

    let entityId: string

    if (card.cardType === CardType.TROOP) {
      const troop = new Troop(owner, card.stats as EntityStats, worldPos, this.grid)
      this.state.entities.set(troop.id, troop)
      entityId = troop.id
    } else if (card.cardType === CardType.BUILDING) {
      const building = new Building(owner, card.stats as EntityStats, worldPos)
      this.state.entities.set(building.id, building)
      entityId = building.id
    } else {
      // Spell
      const spell = new Spell(owner, card.stats as SpellStats, worldPos)
      this.state.entities.set(spell.id, spell)
      entityId = spell.id
    }

    this.state.events.push({ type: 'DEPLOY', entityId, cardId: card.id, position: worldPos })
    return true
  }
}
