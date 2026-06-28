import type { Entity } from './entities/Entity'
import type { Troop } from './entities/Troop'
import type { GameState } from './GameState'
import { EntityKind } from './types'
import type { Owner, Vec2 } from './types'
import { dist } from './Vector2'
import { CELL_SIZE } from '@data/GameConstants'

export function dealAreaDamage(
  state: GameState,
  owner: Owner,
  center: Vec2,
  radiusCells: number,
  damage: number,
  canHit: (entity: Entity) => boolean,
  attackerId?: string,
  primaryId?: string,
): void {
  const radiusPx = radiusCells * CELL_SIZE

  for (const entity of state.entities.values()) {
    if (entity.owner === owner || !entity.isAlive) continue
    if (entity.kind !== EntityKind.TROOP && entity.kind !== EntityKind.BUILDING) continue
    if (!canHit(entity)) continue
    if (dist(center, entity.position) > radiusPx) continue

    entity.takeDamage(damage)
    state.events.push({
      type: 'DAMAGE',
      targetId: entity.id,
      amount: damage,
      attackerId,
      splash: entity.id !== primaryId,
    })
  }

  for (const tower of state.towers.values()) {
    if (tower.owner === owner || !tower.isAlive) continue
    if (!canHit(tower)) continue
    if (dist(center, tower.position) > radiusPx) continue

    tower.takeDamage(damage)
    state.events.push({
      type: 'DAMAGE',
      targetId: tower.id,
      amount: damage,
      attackerId,
      splash: tower.id !== primaryId,
    })
  }
}

export function applyHealInRadius(
  state: GameState,
  owner: Owner,
  center: Vec2,
  radiusCells: number,
  healAmount: number,
  healerId?: string,
): void {
  const radiusPx = radiusCells * CELL_SIZE

  for (const entity of state.entities.values()) {
    if (entity.owner !== owner || !entity.isAlive || entity.kind !== EntityKind.TROOP) continue
    if (entity.hp >= entity.maxHp) continue
    if (dist(center, entity.position) > radiusPx) continue

    const healed = entity.heal(healAmount)
    if (healed > 0) {
      state.events.push({
        type: 'HEAL',
        targetId: entity.id,
        amount: healed,
        healerId,
      })
    }
  }
}

export function applySlowInRadius(
  state: GameState,
  owner: Owner,
  center: Vec2,
  radiusCells: number,
  durationMs: number,
  speedMultiplier: number,
): void {
  const radiusPx = radiusCells * CELL_SIZE

  for (const entity of state.entities.values()) {
    if (entity.owner === owner || !entity.isAlive || entity.kind !== EntityKind.TROOP) continue
    if (dist(center, entity.position) > radiusPx) continue
    ;(entity as Troop).applySlow(durationMs, speedMultiplier)
  }
}
