import type { GameState } from './GameState'
import { Troop } from './entities/Troop'
import { boxesOverlap, entityHalfExtents, separateBoxPair } from './EntityGeometry'
import { EntityKind, UnitType } from './types'
import { CELL_SIZE, EPSILON_DISTANCE } from '@data/GameConstants'

const RESOLVE_PASSES = 6

function groundTroops(state: GameState): Troop[] {
  const troops: Troop[] = []
  for (const entity of state.entities.values()) {
    if (!entity.isAlive || entity.kind !== EntityKind.TROOP) continue
    const troop = entity as Troop
    if (troop.stats.unitType === UnitType.AIR) continue
    troops.push(troop)
  }
  return troops
}

function tryAllyPushFromBehind(pusher: Troop, front: Troop, deltaMs: number): void {
  if (pusher.stats.speed <= front.stats.speed) return

  const dir = pusher.getMarchDirection()
  const len = Math.hypot(dir.x, dir.y)
  if (len < EPSILON_DISTANCE) return

  const nx = dir.x / len
  const ny = dir.y / len
  const toFrontX = front.position.x - pusher.position.x
  const toFrontY = front.position.y - pusher.position.y
  if (toFrontX * nx + toFrontY * ny <= 2) return

  const halfPusher = entityHalfExtents(pusher)
  const halfFront = entityHalfExtents(front)
  if (!boxesOverlap(pusher.position, halfPusher, front.position, halfFront)) return

  const push = (pusher.stats.speed - front.stats.speed) * CELL_SIZE * deltaMs / 1000
  front.position.x += nx * push
  front.position.y += ny * push
}

/**
 * Ground troop body-box collision and ally push-from-behind (CR-style train).
 * Java reference has no troop collision — discrete grid cells only.
 */
export function resolveTroopCollisions(state: GameState, deltaMs: number): void {
  const troops = groundTroops(state)

  for (let pass = 0; pass < RESOLVE_PASSES; pass++) {
    for (let i = 0; i < troops.length; i++) {
      for (let j = i + 1; j < troops.length; j++) {
        const a = troops[i]!
        const b = troops[j]!
        const halfA = entityHalfExtents(a)
        const halfB = entityHalfExtents(b)

        if (!boxesOverlap(a.position, halfA, b.position, halfB)) continue

        if (a.owner === b.owner) {
          tryAllyPushFromBehind(a, b, deltaMs)
          tryAllyPushFromBehind(b, a, deltaMs)
        }

        if (boxesOverlap(a.position, halfA, b.position, halfB)) {
          separateBoxPair(a.position, halfA, b.position, halfB, 0.5)
        }
      }
    }
  }
}
