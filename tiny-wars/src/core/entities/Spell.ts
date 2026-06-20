import { Entity, nextEntityId } from './Entity'
import { EntityKind } from '../types'
import type { Owner, SpellStats, Vec2 } from '../types'
import type { GameState } from '../GameState'
import { dist } from '../Vector2'
import { CELL_SIZE } from '@data/GameConstants'

export class Spell extends Entity {
  // Spells use SpellStats — expose via stats to satisfy Entity contract
  readonly stats: SpellStats
  private applied = false

  constructor(owner: Owner, stats: SpellStats, position: Vec2) {
    // Spells have no HP — set to 1 and die after applying
    super(nextEntityId(), owner, EntityKind.SPELL, position, 1)
    this.stats = stats
  }

  tick(_deltaMs: number, state: GameState): void {
    if (this.applied) return

    this.applied = true
    const radiusPx = this.stats.radius * CELL_SIZE

    // Damage all enemies in radius
    for (const entity of state.entities.values()) {
      if (entity.owner === this.owner) continue
      if (!entity.isAlive) continue
      if (dist(this.position, entity.position) <= radiusPx) {
        entity.takeDamage(this.stats.damage)
        state.events.push({ type: 'DAMAGE', targetId: entity.id, amount: this.stats.damage })
      }
    }

    for (const tower of state.towers.values()) {
      if (tower.owner === this.owner) continue
      if (!tower.isAlive) continue
      if (dist(this.position, tower.position) <= radiusPx) {
        tower.takeDamage(this.stats.damage)
        state.events.push({ type: 'DAMAGE', targetId: tower.id, amount: this.stats.damage })
      }
    }

    state.events.push({
      type: 'SPELL_IMPACT',
      cardId: 'tnt',
      position: { ...this.position },
      radius: radiusPx,
    })

    // Mark for removal
    this.hp = 0
  }
}
