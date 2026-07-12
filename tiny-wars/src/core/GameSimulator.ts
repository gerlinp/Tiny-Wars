import type { GameState } from './GameState'
import { createInitialGameState } from './GameState'
import type { Grid } from './Grid'
import { FlowFieldManager } from './FlowFieldManager'
import { tickElixir, grantElixir } from './ElixirSystem'
import { resolveDeaths, checkTimeWin, tickTowerTieBreak } from './CombatSystem'
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
  SIM_MAX_TICK_MS,
  RIVER_ROW_START,
  RIVER_ROW_END,
} from '@data/GameConstants'
import { getActiveMapConfig } from '@data/ActiveMapConfig'
import { KING_TOWER, PRINCESS_TOWER } from '@data/TowerData'
import { dist } from './Vector2'
import { rocketFlightMs, arrowsRainMs } from '@data/ProjectileConstants'
import { kingCannonMuzzlePosition } from '@rendering/towerGarrison'
import { towerRenderY } from '@rendering/towerRenderPosition'
import { resolveTroopCollisions, restoreBoomerangThrowerAnchors } from './TroopCollision'
import { isTroopDeployCell, troopDeployPositions } from './DeploySystem'
import { tickBoomerangs } from './BoomerangSystem'
import { tickHooks } from './HookSystem'

export { troopDeployPositions } from './DeploySystem'

export class GameSimulator {
  state: GameState
  private flowFieldsDirty = false

  constructor(private grid: Grid) {
    this.state = createInitialGameState()
    this.placeTowers()
    // Build initial flow fields after towers are placed
    const mgr = new FlowFieldManager(grid)
    mgr.rebuild(this.state)
    this.state.flowFields = mgr
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
    // Zero-delta calls (intro freeze frames) must not advance state.tick — in PvP the
    // tick counter is the shared timeline deploys are scheduled on, and each client
    // renders a different number of intro frames.
    if (deltaMs <= 0) return this.state

    deltaMs = Math.min(deltaMs, SIM_MAX_TICK_MS)

    if (this.flowFieldsDirty) {
      this.state.flowFields?.rebuild(this.state)
      this.flowFieldsDirty = false
    }

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
    restoreBoomerangThrowerAnchors(this.state)

    tickBoomerangs(this.state, deltaMs)
    tickHooks(this.state, deltaMs)

    this.unblockDeadBuildings()
    this.unblockDeadTowers()
    tickTowerTieBreak(this.state, deltaMs)
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

    // Miner burrows to any walkable cell — spawn zones don't apply.
    if (card.id !== 'miner' && !isTroopDeployCell(owner, gridPos, this.state.enemyLaneDeploy)) return false

    // Buildings never sit on the bridge — troops may deploy there once the lane unlocks,
    // but a building footprint would block the only crossing.
    if (
      card.cardType === CardType.BUILDING
      && gridPos.y >= RIVER_ROW_START && gridPos.y <= RIVER_ROW_END
    ) return false

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

  /**
   * @param precisePos Optional exact world position under the pointer. When given, troops and
   * spells spawn there (matching the placement preview / finger) instead of snapping to the cell
   * centre. Validity is still checked against `gridPos`. Buildings stay cell-snapped so their
   * footprint aligns to the grid. Pass the same precise position on every PvP client to keep the
   * simulation deterministic.
   */
  deployCard(owner: Owner, card: CardDefinition, gridPos: Vec2, precisePos?: Vec2): boolean {
    if (!this.canDeployAt(owner, card, gridPos)) return false

    if (owner === Owner.PLAYER) this.state.playerElixir -= card.elixirCost
    else                        this.state.botElixir    -= card.elixirCost

    if (card.cardType === CardType.ELIXIR) {
      grantElixir(this.state, owner, card.elixirGain ?? 0)
      return true
    }

    const cellCenter: Vec2 = {
      x: gridPos.x * CELL_SIZE + CELL_SIZE / 2,
      y: gridPos.y * CELL_SIZE + CELL_SIZE / 2,
    }
    // Buildings keep the cell centre (footprint must align to the grid); troops/spells follow the
    // pointer when a precise position is supplied.
    const worldPos: Vec2 =
      precisePos && card.cardType !== CardType.BUILDING ? precisePos : cellCenter

    if (card.cardType === CardType.TROOP) {
      const count = card.deployCount ?? 1
      const positions = troopDeployPositions(worldPos, count, TROOP_DEPLOY_SPREAD_CELLS)

      for (const pos of positions) {
        const troop = new Troop(owner, card.stats as EntityStats, pos, this.grid, card.id)
        this.state.entities.set(troop.id, troop)
        troop.applySpawnDelay()
        troop.applySpawnHeal(this.state)
        this.state.events.push({ type: 'DEPLOY', entityId: troop.id, cardId: card.id, position: pos })
      }
      // Minotaur's arrival slam now fires from Troop.onSpawnLanding (see GROUND_SLAM event)
      // so it lands in sync with the drop-in animation instead of instantly on deploy.
      return true
    } else if (card.cardType === CardType.BUILDING) {
      const building = new Building(owner, card.stats as EntityStats, worldPos, card.id)
      this.state.entities.set(building.id, building)
      for (const cell of building.blockedCells) {
        this.grid.blockCell(cell.x, cell.y)
      }
      this.flowFieldsDirty = true
      this.state.events.push({ type: 'DEPLOY', entityId: building.id, cardId: card.id, position: worldPos })
      return true
    } else if (card.cardType === CardType.SPELL) {
      const stats = card.spellStats!
      const kingPos = this.kingTowerPosition(owner)
      const launchFrom = stats.delivery === 'rocket'
        ? kingCannonMuzzlePosition(
            kingPos.x,
            towerRenderY(kingPos.y, owner, true, kingPos.x),
            owner,
          )
        : kingPos
      const flightMs = stats.delivery === 'arrows'
        ? arrowsRainMs()
        : rocketFlightMs(dist(launchFrom, worldPos))
      const impactAt = this.state.elapsedMs + flightMs
      const spell = new Spell(owner, stats, worldPos, card.id, impactAt, this.grid)
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
        this.flowFieldsDirty = true
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
        this.flowFieldsDirty = true
      }
    }
  }
}
