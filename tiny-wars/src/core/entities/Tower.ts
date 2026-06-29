import { Entity, nextEntityId } from './Entity'
import { EntityKind } from '../types'
import type { Owner, Vec2 } from '../types'
import type { TowerDefinition } from '@data/TowerData'
import type { GameState } from '../GameState'
import { distSq } from '../Vector2'
import { refreshStickyTarget } from '../TargetSelection'
import { entityCollisionCenter, gridCellsForFootprint } from '../EntityGeometry'
import { CELL_SIZE, towerFootprintHalfExtents } from '@data/GameConstants'
import { towerAttackCenter } from '@rendering/towerRenderPosition'

export class Tower extends Entity {
  readonly stats: TowerDefinition
  readonly isKing: boolean
  readonly blockedCells: readonly Vec2[]

  private attackCooldownMs = 0
  private active = false  // King Tower activates once a Princess Tower is destroyed
  private target: Entity | null = null

  constructor(owner: Owner, def: TowerDefinition, position: Vec2) {
    super(nextEntityId(), owner, EntityKind.TOWER, position, def.maxHp)
    this.stats  = def
    this.isKing = def.isKing
    // Princess towers start active; King Tower starts dormant
    this.active = !def.isKing
    const center = entityCollisionCenter(this)
    const { halfW, halfH } = towerFootprintHalfExtents(this.isKing)
    this.blockedCells = gridCellsForFootprint(center, halfW, halfH)
  }

  /** Called when a friendly Princess Tower is destroyed or the king takes damage. */
  activate(): void {
    if (!this.active && this.isKing) {
      this.attackCooldownMs = 1000
    }
    this.active = true
  }

  override takeDamage(amount: number): void {
    super.takeDamage(amount)
    if (this.isKing && amount > 0) this.activate()
  }

  isActive(): boolean {
    return this.active
  }

  getAttackCooldownMs(): number {
    return this.attackCooldownMs
  }

  /** Locked attack target — one unit at a time (nearest in range). */
  getTarget(): Entity | null {
    return this.target
  }

  /** Nearest current target position — used to aim garrison archers. */
  getAimPoint(): Vec2 | null {
    return this.aimPoint
  }

  private aimPoint: Vec2 | null = null

  tick(deltaMs: number, state: GameState): void {
    if (!this.isAlive) return
    if (!this.active) {
      this.target = null
      this.aimPoint = null
      return
    }

    const rangePx = this.stats.range * CELL_SIZE
    const attackFrom = towerAttackCenter(this.position.x, this.position.y, this.owner, this.isKing)
    this.target = refreshStickyTarget(this.target, state, {
      owner: this.owner,
      from: attackFrom,
      maxDistance: rangePx,
      distance: (from, entity) => Math.sqrt(distSq(from, entity.position)),
    })

    if (this.target) {
      this.aimPoint = { x: this.target.position.x, y: this.target.position.y }
    } else if (this.attackCooldownMs <= 0) {
      this.aimPoint = null
    }

    if (this.attackCooldownMs > 0) {
      this.attackCooldownMs -= deltaMs
      return
    }

    if (!this.target?.isAlive) return
    if (Math.sqrt(distSq(attackFrom, this.target.position)) > rangePx) return

    this.target.takeDamage(this.stats.damage)
    state.events.push({
      type: 'DAMAGE',
      targetId: this.target.id,
      amount: this.stats.damage,
      attackerId: this.id,
    })
    this.attackCooldownMs = 1000 / this.stats.attackRate
  }
}
