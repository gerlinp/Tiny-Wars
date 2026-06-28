import type { GameState } from './GameState'
import { createInitialGameState } from './GameState'
import type { Grid } from './Grid'
import { tickElixir, grantElixir } from './ElixirSystem'
import { resolveDeaths, checkTimeWin } from './CombatSystem'
import { Troop } from './entities/Troop'
import { Tower } from './entities/Tower'
import { Building } from './entities/Building'
import { Spell } from './entities/Spell'
import { Owner, CardType, EntityKind } from './types'
import type { Vec2 } from './types'
import type { CardDefinition, EntityStats } from './types'
import {
  CELL_SIZE,
  TROOP_DEPLOY_SPREAD_CELLS,
  PLAYER_KING_ROW,
  PLAYER_KING_COL,
  PLAYER_TOWER_ROW,
  PLAYER_TOWER_COLS,
  BOT_KING_ROW,
  BOT_KING_COL,
  BOT_TOWER_ROW,
  BOT_TOWER_COLS,
} from '@data/GameConstants'
import { getActiveMapConfig } from '@data/ActiveMapConfig'
import { KING_TOWER, PRINCESS_TOWER } from '@data/TowerData'
import { dist } from './Vector2'
import { rocketFlightMs, arrowsRainMs } from '@data/ProjectileConstants'
import { resolveTroopCollisions } from './TroopCollision'
import { isTroopDeployCell } from './DeployZones'

export class GameSimulator {
  state: GameState

  constructor(private grid: Grid) {
    this.state = createInitialGameState()
    this.placeTowers()
  }

  private placeTowers(): void {
    const config = getActiveMapConfig()
    const place = (owner: Owner, def: typeof KING_TOWER, col: number, row: number) => {
      const pos: Vec2 = {
        x: col * CELL_SIZE + CELL_SIZE / 2,
        y: row * CELL_SIZE + CELL_SIZE / 2,
      }
      const tower = new Tower(owner, def, pos)
      for (const cell of tower.blockedCells) {
        this.grid.blockCell(cell.x, cell.y)
      }
      this.state.towers.set(tower.id, tower)
    }

    const plyKingCol  = config ? config.playerKingCol          : PLAYER_KING_COL
    const plyKingRow  = config ? config.playerKingRow          : PLAYER_KING_ROW
    const plyTowerRow = config ? config.playerTowerRow         : PLAYER_TOWER_ROW
    const plyTowerCols = config ? config.playerTowerCols       : PLAYER_TOWER_COLS
    const botKingCol  = config ? config.botKingCol             : BOT_KING_COL
    const botKingRow  = config ? config.botKingRow             : BOT_KING_ROW
    const botTowerRow = config ? config.botTowerRow            : BOT_TOWER_ROW
    const botTowerCols = config ? config.botTowerCols          : BOT_TOWER_COLS

    place(Owner.PLAYER, KING_TOWER,     plyKingCol, plyKingRow)
    for (const col of plyTowerCols) {
      place(Owner.PLAYER, PRINCESS_TOWER, col, plyTowerRow)
    }

    place(Owner.BOT, KING_TOWER,     botKingCol, botKingRow)
    for (const col of botTowerCols) {
      place(Owner.BOT, PRINCESS_TOWER, col, botTowerRow)
    }
  }

  tick(deltaMs: number): GameState {
    if (this.state.phase === 'ENDED') return this.state

    this.state.tick++
    this.state.elapsedMs += deltaMs

    tickElixir(this.state, deltaMs)

    for (const entity of this.state.entities.values()) {
      entity.tick(deltaMs, this.state)
    }

    for (const tower of this.state.towers.values()) {
      tower.tick(deltaMs, this.state)
    }

    resolveTroopCollisions(this.state, deltaMs)

    this.unblockDeadBuildings()
    this.unblockDeadTowers()
    resolveDeaths(this.state)
    checkTimeWin(this.state, this.state.elapsedMs)

    return this.state
  }

  canDeployAt(owner: Owner, card: CardDefinition, gridPos: Vec2): boolean {
    if (gridPos.x < 0 || gridPos.x >= this.grid.cols) return false
    if (gridPos.y < 0 || gridPos.y >= this.grid.rows) return false

    const elixir = owner === Owner.PLAYER ? this.state.playerElixir : this.state.botElixir
    if (elixir < card.elixirCost) return false

    if (card.cardType === CardType.ELIXIR || card.cardType === CardType.SPELL) return true

    if (!isTroopDeployCell(owner, gridPos, this.state.enemyLaneDeploy)) return false

    if (!this.grid.isWalkable(gridPos.x, gridPos.y)) return false

    return true
  }

  private kingTowerPosition(owner: Owner): Vec2 {
    for (const tower of this.state.towers.values()) {
      if (tower.owner === owner && tower.isKing) {
        return { x: tower.position.x, y: tower.position.y }
      }
    }
    const col = owner === Owner.PLAYER ? PLAYER_KING_COL : BOT_KING_COL
    const row = owner === Owner.PLAYER ? PLAYER_KING_ROW : BOT_KING_ROW
    return {
      x: col * CELL_SIZE + CELL_SIZE / 2,
      y: row * CELL_SIZE + CELL_SIZE / 2,
    }
  }

  deployCard(owner: Owner, card: CardDefinition, gridPos: Vec2): boolean {
    if (!this.canDeployAt(owner, card, gridPos)) return false

    if (owner === Owner.PLAYER) this.state.playerElixir -= card.elixirCost
    else                        this.state.botElixir    -= card.elixirCost

    if (card.cardType === CardType.ELIXIR) {
      grantElixir(this.state, owner, card.elixirGain ?? 0)
      return true
    }

    const worldPos: Vec2 = {
      x: gridPos.x * CELL_SIZE + CELL_SIZE / 2,
      y: gridPos.y * CELL_SIZE + CELL_SIZE / 2,
    }

    if (card.cardType === CardType.TROOP) {
      const count = card.deployCount ?? 1
      const spreadPx = TROOP_DEPLOY_SPREAD_CELLS * CELL_SIZE
      const offsets = count === 1
        ? [0]
        : Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * spreadPx)

      for (const xOffset of offsets) {
        const pos: Vec2 = { x: worldPos.x + xOffset, y: worldPos.y }
        const troop = new Troop(owner, card.stats as EntityStats, pos, this.grid, card.id)
        this.state.entities.set(troop.id, troop)
        troop.applySpawnHeal(this.state)
        this.state.events.push({ type: 'DEPLOY', entityId: troop.id, cardId: card.id, position: pos })
      }
      return true
    } else if (card.cardType === CardType.BUILDING) {
      const building = new Building(owner, card.stats as EntityStats, worldPos, card.id)
      this.state.entities.set(building.id, building)
      for (const cell of building.blockedCells) {
        this.grid.blockCell(cell.x, cell.y)
      }
      this.state.events.push({ type: 'DEPLOY', entityId: building.id, cardId: card.id, position: worldPos })
      return true
    } else if (card.cardType === CardType.SPELL) {
      const stats = card.spellStats!
      const launchFrom = this.kingTowerPosition(owner)
      const flightMs = stats.delivery === 'arrows'
        ? arrowsRainMs()
        : rocketFlightMs(dist(launchFrom, worldPos))
      const impactAt = this.state.elapsedMs + flightMs
      const spell = new Spell(owner, stats, worldPos, card.id, impactAt)
      this.state.entities.set(spell.id, spell)
      this.state.events.push({
        type: 'SPELL_CAST',
        cardId: card.id,
        owner,
        from: launchFrom,
        to: worldPos,
        flightMs,
        entityId: spell.id,
      })
      return true
    } else {
      return false
    }
  }

  private unblockDeadTowers(): void {
    for (const [, tower] of this.state.towers) {
      if (!tower.isAlive) {
        for (const cell of tower.blockedCells) {
          this.grid.unblockCell(cell.x, cell.y)
        }
      }
    }
  }

  private unblockDeadBuildings(): void {
    for (const entity of this.state.entities.values()) {
      if (!entity.isAlive && entity.kind === EntityKind.BUILDING) {
        const building = entity as Building
        for (const cell of building.blockedCells) {
          this.grid.unblockCell(cell.x, cell.y)
        }
      }
    }
  }
}
