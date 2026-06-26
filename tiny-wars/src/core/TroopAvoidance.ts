import type { GameState } from './GameState'
import type { Grid } from './Grid'
import { Troop } from './entities/Troop'
import { circlesOverlap, troopCollisionRadius } from './EntityGeometry'
import { EntityKind, TroopState, UnitType } from './types'
import type { Vec2 } from './types'
import { isWorldWalkable, moveTowardDirect } from './Movement'
import { CELL_SIZE, EPSILON_DISTANCE } from '@data/GameConstants'

/** Melee-only — ranged troops stay grouped and attack from behind the front line. */
const MELEE_ATTACK_RANGE_CELLS = 2

/** How far ahead (in body widths) to look for a directly stacked ally. */
const ALLY_BLOCK_LOOKAHEAD_MULT = 1.75
/** Lateral steering weight when stacked behind an ally (keep subtle). */
const ALLY_AVOID_LATERAL_BLEND = 0.38

interface AllyBlock {
  lateral: 1 | -1
}

function isMeleeTroop(troop: Troop): boolean {
  return troop.stats.attackRange <= MELEE_ATTACK_RANGE_CELLS
}

function goalDirection(from: Vec2, goal: Vec2): Vec2 | null {
  const dx = goal.x - from.x
  const dy = goal.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < EPSILON_DISTANCE) return null
  return { x: dx / len, y: dy / len }
}

function groundAllies(troop: Troop, state: GameState): Troop[] {
  const allies: Troop[] = []
  for (const entity of state.entities.values()) {
    if (!entity.isAlive || entity.kind !== EntityKind.TROOP) continue
    if (entity.owner !== troop.owner || entity.id === troop.id) continue
    const ally = entity as Troop
    if (ally.stats.unitType !== UnitType.GROUND) continue
    allies.push(ally)
  }
  return allies
}

function moveStepIfWalkable(pos: Vec2, mx: number, my: number, step: number, grid: Grid): boolean {
  const len = Math.hypot(mx, my)
  if (len < EPSILON_DISTANCE) return false

  const move = Math.min(step, len)
  const nextX = pos.x + (mx / len) * move
  const nextY = pos.y + (my / len) * move
  if (!isWorldWalkable(grid, nextX, nextY)) return false

  pos.x = nextX
  pos.y = nextY
  return true
}

/** Ally directly ahead in the same lane — rear melee should sidestep around them. */
export function findBlockingAlly(troop: Troop, goal: Vec2, state: GameState): AllyBlock | null {
  if (!isMeleeTroop(troop)) return null

  const dir = goalDirection(troop.position, goal)
  if (!dir) return null

  const radius = troopCollisionRadius(troop)
  const lookAhead = radius * ALLY_BLOCK_LOOKAHEAD_MULT * 2 + CELL_SIZE * 0.25

  let bestAhead = Infinity
  let bestLateral: 1 | -1 = 1

  for (const ally of groundAllies(troop, state)) {
    const allyRadius = troopCollisionRadius(ally)
    const toAllyX = ally.position.x - troop.position.x
    const toAllyY = ally.position.y - troop.position.y
    const ahead = toAllyX * dir.x + toAllyY * dir.y
    if (ahead <= 0) continue

    const lateral = Math.abs(-dir.y * toAllyX + dir.x * toAllyY)
    const stackLane = radius + allyRadius - CELL_SIZE * 0.15
    const blockDepth = radius + allyRadius + CELL_SIZE * 0.1
    if (lateral >= stackLane || ahead >= lookAhead + blockDepth) continue
    if (ahead >= bestAhead) continue

    bestAhead = ahead
    const cross = dir.x * toAllyY - dir.y * toAllyX
    bestLateral = cross >= 0 ? -1 : 1
  }

  return bestAhead < Infinity ? { lateral: bestLateral } : null
}

/** Move toward goal, steering around allies that block the path (CR-style local avoidance). */
export function moveTowardWithAllyAvoidance(
  pos: Vec2,
  troop: Troop,
  goal: Vec2,
  step: number,
  state: GameState,
  grid: Grid,
): void {
  const dir = goalDirection(pos, goal)
  if (!dir) return

  const block = findBlockingAlly(troop, goal, state)
  if (!block) {
    moveTowardDirect(pos, goal, step)
    return
  }

  const perpX = -dir.y * block.lateral
  const perpY = dir.x * block.lateral
  const fwd = 1 - ALLY_AVOID_LATERAL_BLEND
  const mx = dir.x * fwd + perpX * ALLY_AVOID_LATERAL_BLEND
  const my = dir.y * fwd + perpY * ALLY_AVOID_LATERAL_BLEND

  if (moveStepIfWalkable(pos, mx, my, step, grid)) return

  const altMx = dir.x * fwd + (-perpX) * ALLY_AVOID_LATERAL_BLEND
  const altMy = dir.y * fwd + (-perpY) * ALLY_AVOID_LATERAL_BLEND
  if (moveStepIfWalkable(pos, altMx, altMy, step, grid)) return

  moveStepIfWalkable(pos, dir.x, dir.y, step, grid)
}

/**
 * When two melee allies overlap in a train, nudge the rear unit sideways so it can flank.
 * Returns true if a lateral separation was applied.
 */
export function tryAllyLateralSeparation(rear: Troop, front: Troop): boolean {
  if (!isMeleeTroop(rear)) return false
  if (rear.stats.speed > front.stats.speed && front.state !== TroopState.ATTACKING) return false

  const dir = rear.getMarchDirection()
  const len = Math.hypot(dir.x, dir.y)
  if (len < EPSILON_DISTANCE) return false

  const nx = dir.x / len
  const ny = dir.y / len
  const toFrontX = front.position.x - rear.position.x
  const toFrontY = front.position.y - rear.position.y
  const ahead = toFrontX * nx + toFrontY * ny
  if (ahead <= CELL_SIZE * 0.15) return false

  const lateral = Math.abs(-ny * toFrontX + nx * toFrontY)
  const rearRadius = troopCollisionRadius(rear)
  const frontRadius = troopCollisionRadius(front)
  if (!circlesOverlap(rear.position, rearRadius, front.position, frontRadius)) return false

  const stackLane = rearRadius + frontRadius - CELL_SIZE * 0.15
  if (lateral >= stackLane) return false

  const perpX = -ny
  const perpY = nx
  const cross = nx * toFrontY - ny * toFrontX
  const preferred = cross >= 0 ? -1 : 1
  const nudge = Math.min(rearRadius + frontRadius - lateral + CELL_SIZE * 0.15, CELL_SIZE * 0.45)
  const grid = rear.grid

  for (const side of [preferred, -preferred as 1 | -1]) {
    const trialX = rear.position.x + perpX * side * nudge
    const trialY = rear.position.y + perpY * side * nudge
    if (!isWorldWalkable(grid, trialX, trialY)) continue
    rear.position.x = trialX
    rear.position.y = trialY
    return true
  }

  return false
}

/** Snap a ground troop back onto walkable terrain if separation pushed it into water. */
export function clampGroundTroopToWalkable(troop: Troop): void {
  if (troop.stats.unitType !== UnitType.GROUND) return
  const grid = troop.grid
  if (isWorldWalkable(grid, troop.position.x, troop.position.y)) return

  const origin = grid.worldToCell(troop.position.x, troop.position.y)
  let best: Vec2 | null = null
  let bestDist = Infinity

  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const col = origin.x + dc
      const row = origin.y + dr
      if (!grid.isWalkable(col, row)) continue
      const world = grid.cellToWorld(col, row)
      const d = (world.x - troop.position.x) ** 2 + (world.y - troop.position.y) ** 2
      if (d < bestDist) {
        bestDist = d
        best = world
      }
    }
  }

  if (best) {
    troop.position.x = best.x
    troop.position.y = best.y
  }
}
