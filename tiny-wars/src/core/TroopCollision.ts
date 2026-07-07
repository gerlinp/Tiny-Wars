import type { GameState } from './GameState'
import { Troop } from './entities/Troop'
import { circlesOverlap, separateCirclePair, troopCollisionRadius } from './EntityGeometry'
import { tryAllyLateralSeparation, clampGroundTroopToWalkable } from './TroopAvoidance'
import { EntityKind, TroopState, UnitType } from './types'
import { CELL_SIZE, EPSILON_DISTANCE } from '@data/GameConstants'

// Allies apply this fraction of overlap correction per pass.
// Increased from 0.35 → 0.50: firmer separation means units don't deeply stack, which reduces
// the chaotic collision response that contributed to swarm wave/accordion behaviour.
const ALLY_SEPARATION_FRACTION = 0.50

// Enemies use soft separation too (units overlap slightly and spread out naturally) rather
// than rigid body-blocking. Deviation: Clash Royale has no troop collision at all (discrete
// grid cells); the previous code hard-blocked enemies (fraction 1.0). Tunable here.
const ENEMY_SEPARATION_FRACTION = 0.5

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
    if (troop.isUnderground) continue  // burrowed Miner has no body to shove
    troops.push(troop)
  }
  return troops
}

function airTroops(state: GameState): Troop[] {
  const troops: Troop[] = []
  for (const entity of state.entities.values()) {
    if (!entity.isAlive || entity.kind !== EntityKind.TROOP) continue
    const troop = entity as Troop
    if (troop.stats.unitType !== UnitType.AIR) continue
    troops.push(troop)
  }
  return troops
}

function tryAllyPushFromBehind(pusher: Troop, front: Troop, deltaMs: number): void {
  const pusherWeight = pusher.stats.pushWeight ?? 1.0
  const frontWeight = front.stats.pushWeight ?? 1.0

  // A unit can push a lighter-or-equal ally forward if:
  //  • it's moving faster (speed-based push), OR
  //  • it's heavier even at the same speed (weight-based shove)
  // Neither applies when the front unit is both faster AND heavier.
  const speedDiff = pusher.stats.speed - front.stats.speed
  const weightDiff = pusherWeight - frontWeight
  if (speedDiff <= 0 && weightDiff <= 0) return

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

  // Speed-based component — proportional to speed delta as before.
  const speedPush = Math.max(0, speedDiff) * CELL_SIZE * deltaMs / 1000
  // Weight-based component — heavier unit nudges lighter one even at equal speed.
  // Scaled so a 2× weight difference gives a modest bump (~15% of a medium troop step/tick).
  const weightPush = Math.max(0, weightDiff) * front.stats.speed * CELL_SIZE * deltaMs / 1000 * 0.15
  const push = speedPush + weightPush

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
        // RTS-style combat rooting: a unit actively attacking holds its slot — it
        // neither pushes allies nor gets shoved by them (StarCraft/AoE convention).
        // This is what stops swarms from jostling each other off a tower they're hitting.
        const rootedA = anchoredA || a.state === TroopState.ATTACKING
        const rootedB = anchoredB || b.state === TroopState.ATTACKING
        if (a.owner === b.owner) {
          if (rootedA && rootedB) continue
          if (!rootedA) {
            allyLaterallySeparated = tryAllyLateralSeparation(a, b) || allyLaterallySeparated
          }
          if (!rootedB) {
            allyLaterallySeparated = tryAllyLateralSeparation(b, a) || allyLaterallySeparated
          }
          if (!rootedB) tryAllyPushFromBehind(a, b, deltaMs)
          if (!rootedA) tryAllyPushFromBehind(b, a, deltaMs)
        }

        if (!allyLaterallySeparated && circlesOverlap(a.position, rA, b.position, rB)) {
          if (a.owner === b.owner) {
            if (rootedA && rootedB) continue
            const moveRatioA = rootedA ? 0 : rootedB ? 1 : 0.5
            separateCirclePair(a.position, rA, b.position, rB, moveRatioA, ALLY_SEPARATION_FRACTION)
          } else {
            if (anchoredA && anchoredB) continue
            const moveRatioA = anchoredA ? 0 : anchoredB ? 1 : 0.5
            separateCirclePair(a.position, rA, b.position, rB, moveRatioA, ENEMY_SEPARATION_FRACTION)
          }
        }
      }
    }
  }

  for (const troop of troops) {
    if (!isBoomerangAnchored(troop, state)) {
      clampGroundTroopToWalkable(troop)
    }
  }

  // Fix 4: Air-vs-air collision — air units block each other but pass through ground units.
  const airUnits = airTroops(state)
  for (let pass = 0; pass < RESOLVE_PASSES; pass++) {
    for (let i = 0; i < airUnits.length; i++) {
      for (let j = i + 1; j < airUnits.length; j++) {
        const a = airUnits[i]!
        const b = airUnits[j]!
        const rA = troopCollisionRadius(a)
        const rB = troopCollisionRadius(b)

        if (!circlesOverlap(a.position, rA, b.position, rB)) continue

        const moveRatioA = 0.5
        // Soft separation for both allies and enemies (see ground loop above).
        const fraction = a.owner === b.owner ? ALLY_SEPARATION_FRACTION : ENEMY_SEPARATION_FRACTION
        separateCirclePair(a.position, rA, b.position, rB, moveRatioA, fraction)
      }
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
