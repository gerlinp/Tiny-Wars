import { Entity, nextEntityId } from './Entity'
import { EntityKind, BuildingState } from '../types'
import type { Owner, EntityStats, Vec2 } from '../types'
import type { GameState } from '../GameState'
import { surfaceDistToEntity, gridCellsForFootprint } from '../EntityGeometry'
import { CELL_SIZE, BUILDING_LIFETIME_MS } from '@data/GameConstants'
import { collisionHalfExtentsForCard } from '@rendering/assetDisplaySize'

export class Building extends Entity {
  readonly stats: EntityStats
  readonly halfW: number
  readonly halfH: number
  readonly blockedCells: readonly Vec2[]
  readonly totalLifetimeMs: number
  private remainingLifetimeMs: number
  state: BuildingState = BuildingState.IDLE

  private attackCooldownMs = 0

  getAttackCooldownMs(): number {
    return this.attackCooldownMs
  }

  constructor(owner: Owner, stats: EntityStats, position: Vec2, cardId: string) {
    super(nextEntityId(), owner, EntityKind.BUILDING, position, stats.maxHp, cardId)
    this.stats = stats
    const { halfW, halfH } = collisionHalfExtentsForCard(cardId)
    this.halfW = halfW
    this.halfH = halfH
    this.blockedCells = gridCellsForFootprint(position, halfW, halfH)
    this.totalLifetimeMs = stats.lifetimeMs ?? BUILDING_LIFETIME_MS
    this.remainingLifetimeMs = this.totalLifetimeMs
  }

  tick(deltaMs: number, state: GameState): void {
    if (!this.isAlive) return

    this.applyLifetimeDecay(deltaMs)
    if (!this.isAlive) return

    if (this.attackCooldownMs > 0) {
      this.attackCooldownMs -= deltaMs
      if (this.attackCooldownMs <= 0) this.state = BuildingState.IDLE
    }

    if (this.attackCooldownMs > 0) return

    this.state = BuildingState.IDLE

    const target = this.acquireTarget(state)
    if (!target) return

    this.state = BuildingState.ATTACKING
    target.takeDamage(this.stats.damage)
    state.events.push({
      type: 'DAMAGE',
      targetId: target.id,
      amount: this.stats.damage,
      attackerId: this.id,
    })
    this.attackCooldownMs = 1000 / this.stats.attackRate
  }

  /** HP cap drops linearly over lifetime — matches Java remainingFrameCount expiry. */
  private applyLifetimeDecay(deltaMs: number): void {
    this.remainingLifetimeMs = Math.max(0, this.remainingLifetimeMs - deltaMs)
    const fraction = this.remainingLifetimeMs / this.totalLifetimeMs
    const hpCap = this.maxHp * fraction
    if (this.hp > hpCap) this.hp = hpCap
    if (this.remainingLifetimeMs <= 0) this.hp = 0
  }

  private acquireTarget(state: GameState): Entity | null {
    const range = this.stats.attackRange * CELL_SIZE
    let best: Entity | null = null
    let bestDist = Infinity

    for (const entity of state.entities.values()) {
      if (entity.owner === this.owner) continue
      if (!entity.isAlive) continue
      const d = surfaceDistToEntity(this.position, entity)
      if (d <= range && d < bestDist) {
        bestDist = d
        best = entity
      }
    }

    for (const tower of state.towers.values()) {
      if (tower.owner === this.owner) continue
      if (!tower.isAlive) continue
      const d = surfaceDistToEntity(this.position, tower)
      if (d <= range && d < bestDist) {
        bestDist = d
        best = tower
      }
    }

    return best
  }
}
