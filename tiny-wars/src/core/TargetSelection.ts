import type { Entity } from './entities/Entity'
import type { Tower } from './entities/Tower'
import type { GameState } from './GameState'
import type { Owner, Vec2 } from './types'
import { EntityKind } from './types'

/** King towers are not valid objectives until a friendly princess tower has fallen. */
export function isAttackableTower(tower: Tower): boolean {
  return !tower.isKing || tower.isActive()
}

export type TargetDistanceFn = (from: Vec2, to: Entity) => number

export interface NearestEnemyOptions {
  owner: Owner
  from: Vec2
  distance: TargetDistanceFn
  /** Skip enemies farther than this (pixels). Omit for no cap. */
  maxDistance?: number
  canAttack?: (entity: Entity) => boolean
  includeTowers?: boolean
}

/** Closest enemy troop/building (and optionally tower) by the given distance metric. */
export function findNearestEnemy(state: GameState, opts: NearestEnemyOptions): Entity | null {
  const canAttack = opts.canAttack ?? (() => true)
  let best: Entity | null = null
  let bestDist = Infinity

  for (const entity of state.entities.values()) {
    if (entity.owner === opts.owner) continue
    if (!entity.isAlive) continue
    if (entity.kind !== EntityKind.TROOP && entity.kind !== EntityKind.BUILDING) continue
    if (!canAttack(entity)) continue

    const d = opts.distance(opts.from, entity)
    if (opts.maxDistance !== undefined && d > opts.maxDistance) continue
    if (d < bestDist) {
      bestDist = d
      best = entity
    }
  }

  if (opts.includeTowers) {
    for (const tower of state.towers.values()) {
      if (tower.owner === opts.owner) continue
      if (!tower.isAlive) continue
      if (!canAttack(tower)) continue

      const d = opts.distance(opts.from, tower)
      if (opts.maxDistance !== undefined && d > opts.maxDistance) continue
      if (d < bestDist) {
        bestDist = d
        best = tower
      }
    }
  }

  return best
}

/** Nearest enemy building or tower — no distance cap (CR-style structure awareness). */
export function findNearestEnemyStructure(
  state: GameState,
  opts: Omit<NearestEnemyOptions, 'maxDistance'>,
): Entity | null {
  const canAttack = opts.canAttack ?? (() => true)
  return findNearestEnemy(state, {
    ...opts,
    includeTowers: opts.includeTowers ?? true,
    canAttack: (entity) => {
      if (entity.kind === EntityKind.TROOP) return false
      if (entity.kind === EntityKind.TOWER && !isAttackableTower(entity as Tower)) return false
      return canAttack(entity)
    },
  })
}

/**
 * Global targeting rule (troops, buildings, towers):
 * - Pick the closest valid enemy when acquiring a new target.
 * - Keep attacking that enemy until it dies.
 * - Only then select the next closest enemy.
 */
export function refreshStickyTarget(
  current: Entity | null,
  state: GameState,
  opts: NearestEnemyOptions,
): Entity | null {
  if (current?.isAlive) return current
  return findNearestEnemy(state, opts)
}
