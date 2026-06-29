import type { GameState } from './GameState'
import { Troop } from './entities/Troop'
import { isRangedAttacker } from './CombatHelpers'
import { circlesOverlap, separateCirclePair, troopCollisionRadius } from './EntityGeometry'
import { tryAllyLateralSeparation, clampGroundTroopToWalkable } from './TroopAvoidance'
import { EntityKind, UnitType } from './types'
import { CELL_SIZE, EPSILON_DISTANCE, RIVER_ROW_START, RIVER_ROW_END } from '@data/GameConstants'

// Rows where allies are allowed to fully overlap (bridge crossing zone).
// Rigid separation here causes oscillation: push → wall → clamp → repeat.
const BRIDGE_ZONE_START = RIVER_ROW_START
const BRIDGE_ZONE_END   = RIVER_ROW_END

// Allies apply only this fraction of overlap correction per pass — keeps swarm
// clusters tighter so they fit through the bridge in fewer waves.
const ALLY_SEPARATION_FRACTION = 0.35

function inBridgeZone(troop: Troop): boolean {
  const row = (troop.position.y / CELL_SIZE) | 0
  return row >= BRIDGE_ZONE_START && row <= BRIDGE_ZONE_END
}

function isBoomerangAnchored(troop: Troop, state: GameState): boolean {
  return troop.isBoomerangAnchored(state)
}

const RESOLVE_PASSES = 10

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

  const halfPusher = troopCollisionRadius(pusher)
  const halfFront = troopCollisionRadius(front)
  if (!circlesOverlap(pusher.position, halfPusher, front.position, halfFront)) return

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
        const rA = troopCollisionRadius(a)
        const rB = troopCollisionRadius(b)

        if (!circlesOverlap(a.position, rA, b.position, rB)) continue

        let allyLaterallySeparated = false
        const anchoredA = isBoomerangAnchored(a, state)
        const anchoredB = isBoomerangAnchored(b, state)
        if (a.owner === b.owner) {
          if (!anchoredA) {
            allyLaterallySeparated = tryAllyLateralSeparation(a, b) || allyLaterallySeparated
          }
          if (!anchoredB) {
            allyLaterallySeparated = tryAllyLateralSeparation(b, a) || allyLaterallySeparated
          }
          if (!anchoredB) tryAllyPushFromBehind(a, b, deltaMs)
          if (!anchoredA) tryAllyPushFromBehind(b, a, deltaMs)
        }

        if (!allyLaterallySeparated && circlesOverlap(a.position, rA, b.position, rB)) {
          if (anchoredA && anchoredB) continue
          // Bridge zone: allies ghost through each other rather than oscillating against walls.
          if (a.owner === b.owner && inBridgeZone(a) && inBridgeZone(b)) continue
          // Ranged troops pass through enemies — only melee-vs-melee uses rigid separation.
          if (a.owner !== b.owner && (isRangedAttacker(a) || isRangedAttacker(b))) continue
          const moveRatioA = anchoredA ? 0 : anchoredB ? 1 : 0.5
          const fraction = a.owner === b.owner ? ALLY_SEPARATION_FRACTION : 1.0
          separateCirclePair(a.position, rA, b.position, rB, moveRatioA, fraction)
        }
      }
    }
  }

  for (const troop of troops) {
    if (!isBoomerangAnchored(troop, state)) {
      clampGroundTroopToWalkable(troop)
    }
  }
}

/** Re-pin boomerang throwers after collision so they never slide during a throw. */
export function restoreBoomerangThrowerAnchors(state: GameState): void {
  for (const entity of state.entities.values()) {
    if (!entity.isAlive || entity.kind !== EntityKind.TROOP) continue
    ;(entity as Troop).restoreBoomerangAnchor()
  }
}
