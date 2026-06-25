import { Entity, nextEntityId } from './Entity'
import { EntityKind } from '../types'
import type { Owner, Vec2 } from '../types'
import type { TowerDefinition } from '@data/TowerData'
import type { GameState } from '../GameState'
import { distSq } from '../Vector2'
import { CELL_SIZE } from '@data/GameConstants'

export class Tower extends Entity {
  readonly stats: TowerDefinition
  readonly isKing: boolean

  private attackCooldownMs = 0
  private active = false  // King Tower activates once a Princess Tower is destroyed

  constructor(owner: Owner, def: TowerDefinition, position: Vec2) {
    super(nextEntityId(), owner, EntityKind.TOWER, position, def.maxHp)
    this.stats  = def
    this.isKing = def.isKing
    // Princess towers start active; King Tower starts dormant
    this.active = !def.isKing
  }

  /** Called when a friendly Princess Tower is destroyed */
  activate(): void { this.active = true }

  tick(deltaMs: number, state: GameState): void {
    if (!this.isAlive || !this.active) return

    if (this.attackCooldownMs > 0) {
      this.attackCooldownMs -= deltaMs
      return
    }

    const target = this.acquireTarget(state)
    if (!target) return

    target.takeDamage(this.stats.damage)
    state.events.push({
      type: 'DAMAGE',
      targetId: target.id,
      amount: this.stats.damage,
      attackerId: this.id,
    })
    this.attackCooldownMs = 1000 / this.stats.attackRate
  }

  private acquireTarget(state: GameState): Entity | null {
    const rangeSq = (this.stats.range * CELL_SIZE) ** 2
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
