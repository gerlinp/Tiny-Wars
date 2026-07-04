import Phaser from 'phaser'
import type { GameState } from '@core/GameState'
import type { Grid } from '@core/Grid'
import type { Entity } from '@core/entities/Entity'
import { Troop } from '@core/entities/Troop'
import { Building } from '@core/entities/Building'
import { EntityKind, Owner } from '@core/types'
import {
  CELL_SIZE, GRID_COLS, GRID_ROWS,
  PLAYER_DEPLOY_ROW_MIN, PLAYER_DEPLOY_ROW_MAX,
  BOT_DEPLOY_ROW_MIN, BOT_DEPLOY_ROW_MAX,
  NAV_TERRAIN_COST,
} from '@data/GameConstants'
import { towerTextureKey } from '@rendering/renderingUtils'
import { displaySizeForCard, displaySizeForTower } from '@rendering/assetDisplaySize'
import { towerAttackCenter, towerRenderX, towerRenderY } from '@rendering/towerRenderPosition'
import { entityCollisionCenter, entityCombatRadius, troopCollisionRadius, buildingCombatCenter } from '@core/EntityGeometry'
import { idleSheetKey } from '@data/AssetManifest'
import { resolveTexture } from '@rendering/renderingUtils'

const DEPTH = 15

const COL = {
  grid:      0x44ff88,
  gridLine:  0xffffff,
  river:     0x2266ff,
  bridge:    0xffaa00,
  road:      0xcc8844,
  deploy:    0x44ff44,
  enemyZone: 0xff4444,
  flow:      0x00ffee,
  blocked:   0xff0044,
  sprite:    0x44aaff,
  attack:    0xff4444,
  aggro:     0xffcc44,
  path:      0xff66ff,
  goal:      0xffffff,
  target:    0xff8800,
  tower:     0xaa88ff,
  building:  0x88ffaa,
  player:    0x4488ff,
  bot:       0xff4444,
} as const

export class DevModeOverlay {
  private gfx: Phaser.GameObjects.Graphics
  private visible = false
  private coordLabels: Phaser.GameObjects.Text[] = []

  constructor(private scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(DEPTH)
    this.gfx.setVisible(false)
  }

  setVisible(on: boolean): void {
    this.visible = on
    this.gfx.setVisible(on)
    for (const label of this.coordLabels) label.setVisible(on)
    if (!on) this.gfx.clear()
  }

  update(state: GameState, grid: Grid, entityCardIds: Map<string, string>): void {
    if (!this.visible) return

    const g = this.gfx
    g.clear()

    this.ensureCoordLabels()
    this.drawArenaGrid(grid)
    this.drawFlowField(state, grid)
    this.drawGridFootprints(state, entityCardIds)
    this.drawTowers(state)
    this.drawTroopPaths(state)
  }

  destroy(): void {
    this.gfx.destroy()
    for (const label of this.coordLabels) label.destroy()
    this.coordLabels = []
  }

  /** Col indices along the top edge, row indices along the left edge. */
  private ensureCoordLabels(): void {
    if (this.coordLabels.length > 0) return
    const style = { fontSize: '13px', color: '#88ffcc' }
    for (let col = 0; col < GRID_COLS; col++) {
      this.coordLabels.push(
        this.scene.add.text(col * CELL_SIZE + 3, 2, `${col}`, style).setDepth(DEPTH + 1),
      )
    }
    for (let row = 1; row < GRID_ROWS; row++) {
      this.coordLabels.push(
        this.scene.add.text(3, row * CELL_SIZE + 2, `${row}`, style).setDepth(DEPTH + 1),
      )
    }
  }

  /** Placement grid, terrain (river/bridge/road/blocked), and deploy-zone bands. */
  private drawArenaGrid(grid: Grid): void {
    const g = this.gfx

    g.lineStyle(1, COL.gridLine, 0.15)
    for (let col = 0; col <= GRID_COLS; col++) {
      g.lineBetween(col * CELL_SIZE, 0, col * CELL_SIZE, GRID_ROWS * CELL_SIZE)
    }
    for (let row = 0; row <= GRID_ROWS; row++) {
      g.lineBetween(0, row * CELL_SIZE, GRID_COLS * CELL_SIZE, row * CELL_SIZE)
    }

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = col * CELL_SIZE
        const y = row * CELL_SIZE
        if (grid.isRiverCell(col, row)) {
          g.fillStyle(COL.river, 0.25)
          g.fillRect(x, y, CELL_SIZE, CELL_SIZE)
        } else if (!grid.isWalkable(col, row)) {
          g.fillStyle(COL.blocked, 0.3)
          g.fillRect(x, y, CELL_SIZE, CELL_SIZE)
        } else if (grid.navCostMultiplierAt(col, row) === NAV_TERRAIN_COST.bridge
            && row >= PLAYER_DEPLOY_ROW_MIN - 2 && row <= PLAYER_DEPLOY_ROW_MIN + 1) {
          g.fillStyle(COL.bridge, 0.25)
          g.fillRect(x, y, CELL_SIZE, CELL_SIZE)
        } else if (grid.navCostMultiplierAt(col, row) === NAV_TERRAIN_COST.road) {
          g.fillStyle(COL.road, 0.3)
          g.fillRect(x, y, CELL_SIZE, CELL_SIZE)
        }
      }
    }

    // Deploy bands — friendly rows green, enemy rows red (lane-unlock paint not shown here)
    g.lineStyle(2, COL.deploy, 0.5)
    g.strokeRect(0, PLAYER_DEPLOY_ROW_MIN * CELL_SIZE, GRID_COLS * CELL_SIZE,
      (PLAYER_DEPLOY_ROW_MAX - PLAYER_DEPLOY_ROW_MIN + 1) * CELL_SIZE)
    g.lineStyle(2, COL.enemyZone, 0.5)
    g.strokeRect(0, BOT_DEPLOY_ROW_MIN * CELL_SIZE, GRID_COLS * CELL_SIZE,
      (BOT_DEPLOY_ROW_MAX - BOT_DEPLOY_ROW_MIN + 1) * CELL_SIZE)
  }

  /** Flow-field direction vectors toward the first alive enemy (bot) tower objective. */
  private drawFlowField(state: GameState, _grid: Grid): void {
    const fields = state.flowFields
    if (!fields) return
    let objectiveId: string | null = null
    for (const tower of state.towers.values()) {
      if (tower.isAlive && tower.owner === Owner.BOT) {
        objectiveId = tower.id
        if (!tower.isKing) break  // prefer a princess objective when one stands
      }
    }
    if (!objectiveId || !fields.hasField(objectiveId)) return

    const g = this.gfx
    const arrow = CELL_SIZE * 0.32
    g.lineStyle(1, COL.flow, 0.45)
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cx = col * CELL_SIZE + CELL_SIZE / 2
        const cy = row * CELL_SIZE + CELL_SIZE / 2
        const dir = fields.directionTo(objectiveId, cx, cy)
        if (!dir) continue
        g.lineBetween(cx, cy, cx + dir.x * arrow, cy + dir.y * arrow)
        g.fillStyle(COL.flow, 0.5)
        g.fillCircle(cx + dir.x * arrow, cy + dir.y * arrow, 1.6)
      }
    }
  }

  private ownerColor(owner: Owner): number {
    return owner === Owner.PLAYER ? COL.player : COL.bot
  }

  private drawGridFootprints(state: GameState, entityCardIds: Map<string, string>): void {
    const g = this.gfx

    for (const entity of state.entities.values()) {
      if (!entity.isAlive) continue

      const ownerCol = this.ownerColor(entity.owner)
      const cardId = entityCardIds.get(entity.id)

      // Collision footprint — small circle for troops, box for buildings
      if (entity.kind === EntityKind.TROOP) {
        const radius = troopCollisionRadius(entity)
        g.lineStyle(3, COL.grid, 0.9)
        g.strokeCircle(entity.position.x, entity.position.y, radius)
      } else if (entity.kind === EntityKind.BUILDING) {
        const building = entity as Building
        const combatCenter = buildingCombatCenter(building)
        const combatR = building.combatRadiusPx
        g.lineStyle(3, COL.building, 0.9)
        g.strokeCircle(combatCenter.x, combatCenter.y, combatR)
        g.lineStyle(2, COL.building, 0.45)
        g.strokeRect(
          building.position.x - building.pathHalfW,
          building.position.y - building.pathHalfH * 2,
          building.pathHalfW * 2,
          building.pathHalfH * 2,
        )
      }

      // Sprite display bounds
      if (cardId) {
        const sheetKey = idleSheetKey(cardId, entity.owner)
        const fallback = entity.owner === Owner.PLAYER ? 'placeholder_player' : 'placeholder_bot'
        const key = resolveTexture(this.scene, sheetKey, fallback)
        const size = displaySizeForCard(this.scene, cardId, key, 0)
        g.lineStyle(3, COL.sprite, 0.85)
        if (entity.kind === EntityKind.BUILDING) {
          g.strokeRect(
            entity.position.x - size.width / 2,
            entity.position.y - size.height,
            size.width,
            size.height,
          )
        } else {
          g.strokeRect(
            entity.position.x - size.width / 2,
            entity.position.y - size.height / 2,
            size.width,
            size.height,
          )
        }
      }

      // Attack range (red)
      const attackRangePx = this.attackRangePx(entity)
      if (attackRangePx > 0) {
        g.lineStyle(3, COL.attack, 0.55)
        const rangeCenter = entity.kind === EntityKind.BUILDING
          ? entityCollisionCenter(entity)
          : entity.position
        g.strokeCircle(rangeCenter.x, rangeCenter.y, attackRangePx)
      }

      // Aggro / vision range (yellow) — troops only
      if (entity.kind === EntityKind.TROOP) {
        const troop = entity as Troop
        const aggroPx = troop.getAggroRangePx()
        g.lineStyle(2, COL.aggro, 0.35)
        g.strokeCircle(entity.position.x, entity.position.y, aggroPx)
      }

      // Owner tint dot at centre
      g.fillStyle(ownerCol, 0.8)
      g.fillCircle(entity.position.x, entity.position.y, 6)
    }
  }

  private drawTowers(state: GameState): void {
    const g = this.gfx

    for (const tower of state.towers.values()) {
      if (!tower.isAlive) continue

      const collisionCenter = entityCollisionCenter(tower)
      const combatR = entityCombatRadius(tower)!

      g.lineStyle(3, COL.tower, 0.9)
      g.strokeCircle(collisionCenter.x, collisionCenter.y, combatR)

      const key = towerTextureKey(tower.isKing, tower.owner)
      const size = displaySizeForTower(this.scene, tower.isKing, key)
      const rx = towerRenderX(tower.position.x, tower.owner, tower.isKing)
      const ry = towerRenderY(tower.position.y, tower.owner, tower.isKing, tower.position.x)

      g.lineStyle(3, COL.sprite, 0.7)
      g.strokeRect(
        rx - size.width / 2,
        ry - size.height / 2,
        size.width,
        size.height,
      )

      const rangePx = tower.stats.range * CELL_SIZE
      const attackCenter = towerAttackCenter(
        tower.position.x,
        tower.position.y,
        tower.owner,
        tower.isKing,
      )
      if (!tower.isKing || tower.isActive()) {
        g.lineStyle(3, COL.attack, 0.5)
        g.strokeCircle(attackCenter.x, attackCenter.y, rangePx)
      }

      g.fillStyle(this.ownerColor(tower.owner), 0.8)
      g.fillCircle(attackCenter.x, attackCenter.y, tower.isActive() ? 6 : 4)
    }
  }

  private drawTroopPaths(state: GameState): void {
    const g = this.gfx

    for (const entity of state.entities.values()) {
      if (!entity.isAlive || entity.kind !== EntityKind.TROOP) continue

      const troop = entity as Troop
      const info = troop.getDevInfo(state)

      if (info.waypoints.length === 0 && !info.goal && !info.targetPos && !info.marchGoal) continue

      let prevX = entity.position.x
      let prevY = entity.position.y

      g.lineStyle(4, COL.path, 0.85)
      for (const wp of info.waypoints) {
        g.lineBetween(prevX, prevY, wp.x, wp.y)
        g.fillStyle(COL.path, 0.9)
        g.fillCircle(wp.x, wp.y, 8)
        prevX = wp.x
        prevY = wp.y
      }

      const finalGoal = info.goal ?? info.marchGoal
      if (finalGoal) {
        g.lineStyle(4, COL.path, 0.5)
        g.lineBetween(prevX, prevY, finalGoal.x, finalGoal.y)
        g.lineStyle(3, COL.goal, 0.9)
        g.strokeCircle(finalGoal.x, finalGoal.y, 12)
      }

      if (info.targetPos) {
        g.lineStyle(3, COL.target, 0.9)
        g.lineBetween(entity.position.x, entity.position.y, info.targetPos.x, info.targetPos.y)
        g.fillStyle(COL.target, 0.9)
        g.fillCircle(info.targetPos.x, info.targetPos.y, 10)
      }
    }
  }

  private attackRangePx(entity: Entity): number {
    if (entity.kind === EntityKind.TROOP) return (entity as Troop).stats.attackRange * CELL_SIZE
    if (entity.kind === EntityKind.BUILDING) return (entity as Building).stats.attackRange * CELL_SIZE
    return 0
  }
}
