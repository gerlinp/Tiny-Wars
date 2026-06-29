import type { Entity } from './entities/Entity'
import { EntityKind } from './types'
import type { EntityStats } from './types'

/** Troops/buildings with attack range beyond melee, plus all towers. */
export function isRangedAttacker(entity: Entity): boolean {
  if (entity.kind === EntityKind.TOWER) return true
  if (entity.kind === EntityKind.TROOP || entity.kind === EntityKind.BUILDING) {
    return (entity.stats as EntityStats).attackRange > 2
  }
  return false
}

/** Melee troops/buildings — immediate strike, no projectile VFX. */
export function isMeleeAttacker(entity: Entity): boolean {
  if (entity.kind !== EntityKind.TROOP && entity.kind !== EntityKind.BUILDING) return false
  return !isRangedAttacker(entity)
}
