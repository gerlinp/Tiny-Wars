import Phaser from 'phaser'
import type { GameState } from '@core/GameState'
import type { Grid } from '@core/Grid'
import type { Entity } from '@core/entities/Entity'
import { Troop } from '@core/entities/Troop'
import { Building } from '@core/entities/Building'
import { EntityKind, Owner } from '@core/types'
import { CELL_SIZE } from '@data/GameConstants'
import { towerTextureKey } from '@rendering/AssetRegistry'
import { displaySizeForCard, displaySizeForTower } from '@rendering/assetDisplaySize'
import { towerRenderX, towerRenderY } from '@rendering/towerRenderPosition'
import { entityCollisionCenter, entityHalfExtents, troopCollisionRadius, buildingCombatCenter, buildingCombatRadius } from '@core/EntityGeometry'
import { idleSheetKey } from '@data/AssetManifest'
import { resolveTexture } from '@rendering/PlaceholderFactory'

const DEPTH = 15

const COL = {
  grid:      0x44ff88,
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

  constructor(private scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(DEPTH)
    this.gfx.setVisible(false)
  }

  setVisible(on: boolean): void {
    this.visible = on
    this.gfx.setVisible(on)
    if (!on) this.gfx.clear()
  }

  update(state: GameState, _grid: Grid, entityCardIds: Map<string, string>): void {
    if (!this.visible) return

    const g = this.gfx
    g.clear()

    this.drawGridFootprints(state, entityCardIds)
    this.drawTowers(state)
    this.drawTroopPaths(state)
  }

  destroy(): void {
    this.gfx.destroy()
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
        g.lineStyle(1.5, COL.grid, 0.9)
        g.strokeCircle(entity.position.x, entity.position.y, radius)
      } else if (entity.kind === EntityKind.BUILDING) {
        const building = entity as Building
        const combatCenter = buildingCombatCenter(building)
        const combatR = buildingCombatRadius()
        g.lineStyle(1.5, COL.building, 0.9)
        g.strokeCircle(combatCenter.x, combatCenter.y, combatR)
        g.lineStyle(1, COL.building, 0.45)
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
        g.lineStyle(1.5, COL.sprite, 0.85)
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
        g.lineStyle(1.5, COL.attack, 0.55)
        const rangeCenter = entity.kind === EntityKind.BUILDING
          ? entityCollisionCenter(entity)
          : entity.position
        g.strokeCircle(rangeCenter.x, rangeCenter.y, attackRangePx)
      }

      // Aggro / vision range (yellow) — troops only
      if (entity.kind === EntityKind.TROOP) {
        const troop = entity as Troop
        const aggroPx = troop.getAggroRangePx()
        g.lineStyle(1, COL.aggro, 0.35)
        g.strokeCircle(entity.position.x, entity.position.y, aggroPx)
      }

      // Owner tint dot at centre
      g.fillStyle(ownerCol, 0.8)
      g.fillCircle(entity.position.x, entity.position.y, 3)
    }
  }

  private drawTowers(state: GameState): void {
    const g = this.gfx

    for (const tower of state.towers.values()) {
      if (!tower.isAlive) continue

      const half = entityHalfExtents(tower)

      const collisionCenter = entityCollisionCenter(tower)

      g.lineStyle(1.5, COL.tower, 0.9)
      g.strokeRect(
        collisionCenter.x - half.halfW,
        collisionCenter.y - half.halfH,
        half.halfW * 2,
        half.halfH * 2,
      )

      const key = towerTextureKey(tower.isKing, tower.owner)
      const size = displaySizeForTower(this.scene, tower.isKing, key)
      const rx = towerRenderX(tower.position.x, tower.owner, tower.isKing)
      const ry = towerRenderY(tower.position.y, tower.owner, tower.isKing, tower.position.x)

      g.lineStyle(1.5, COL.sprite, 0.7)
      g.strokeRect(
        rx - size.width / 2,
        ry - size.height / 2,
        size.width,
        size.height,
      )

      const rangePx = tower.stats.range * CELL_SIZE
      g.lineStyle(1.5, COL.attack, 0.5)
      g.strokeCircle(tower.position.x, tower.position.y, rangePx)

      g.fillStyle(this.ownerColor(tower.owner), 0.8)
      g.fillCircle(tower.position.x, tower.position.y, 3)
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

      g.lineStyle(2, COL.path, 0.85)
      for (const wp of info.waypoints) {
        g.lineBetween(prevX, prevY, wp.x, wp.y)
        g.fillStyle(COL.path, 0.9)
        g.fillCircle(wp.x, wp.y, 4)
        prevX = wp.x
        prevY = wp.y
      }

      const finalGoal = info.goal ?? info.marchGoal
      if (finalGoal) {
        g.lineStyle(2, COL.path, 0.5)
        g.lineBetween(prevX, prevY, finalGoal.x, finalGoal.y)
        g.lineStyle(1.5, COL.goal, 0.9)
        g.strokeCircle(finalGoal.x, finalGoal.y, 6)
      }

      if (info.targetPos) {
        g.lineStyle(1.5, COL.target, 0.9)
        g.lineBetween(entity.position.x, entity.position.y, info.targetPos.x, info.targetPos.y)
        g.fillStyle(COL.target, 0.9)
        g.fillCircle(info.targetPos.x, info.targetPos.y, 5)
      }
    }
  }

  private attackRangePx(entity: Entity): number {
    if (entity.kind === EntityKind.TROOP) return (entity as Troop).stats.attackRange * CELL_SIZE
    if (entity.kind === EntityKind.BUILDING) return (entity as Building).stats.attackRange * CELL_SIZE
    return 0
  }
}
