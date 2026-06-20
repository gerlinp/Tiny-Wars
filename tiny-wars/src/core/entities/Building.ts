import { Entity, nextEntityId } from './Entity'
import { EntityKind } from '../types'
import type { Owner, EntityStats, Vec2 } from '../types'
import type { GameState } from '../GameState'
import { distSq } from '../Vector2'
import { CELL_SIZE } from '@data/GameConstants'

export class Building extends Entity {
  readonly stats: EntityStats
  private attackCooldownMs = 0

  constructor(owner: Owner, stats: EntityStats, position: Vec2) {
    super(nextEntityId(), owner, EntityKind.BUILDING, position, stats.maxHp)
    this.stats = stats
  }

  tick(deltaMs: number, state: GameState): void {
    if (!this.isAlive) return

    if (this.attackCooldownMs > 0) {
      this.attackCooldownMs -= deltaMs
      return
    }

    const target = this.acquireTarget(state)
    if (!target) return

    target.takeDamage(this.stats.damage)
    state.events.push({ type: 'DAMAGE', targetId: target.id, amount: this.stats.damage })
    this.attackCooldownMs = 1000 / this.stats.attackRate
  }

  private acquireTarget(state: GameState): Entity | null {
    const rangeSq = (this.stats.attackRange * CELL_SIZE) ** 2
    let best: Entity | null = null
    let bestDsq = Infinity

    for (const entity of state.entities.values()) {
      if (entity.owner === this.owner) continue
      if (!entity.isAlive) continue
      const dsq = distSq(this.position, entity.position)
      if (dsq <= rangeSq && dsq < bestDsq) {
        bestDsq = dsq
        best = entity
      }
    }

    return best
  }
}
