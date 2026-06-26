import type { Grid } from './Grid'
import type { Vec2 } from './types'
import { CELL_SIZE, RIVER_ROW_START, RIVER_ROW_END, BRIDGE_COLS, EPSILON_DISTANCE } from '@data/GameConstants'

const WAYPOINT_EPS = 2

export function isWorldWalkable(grid: Grid, wx: number, wy: number): boolean {
  const col = Math.floor(wx / CELL_SIZE)
  const row = Math.floor(wy / CELL_SIZE)
  return grid.isWalkable(col, row)
}

export function worldRow(wy: number): number {
  return Math.floor(wy / CELL_SIZE)
}

/** True when start and goal are on opposite sides of the river. */
export function isOppositeRiverBank(from: Vec2, to: Vec2): boolean {
  const fromRow = worldRow(from.y)
  const toRow = worldRow(to.y)
  const fromBelow = fromRow > RIVER_ROW_END
  const fromAbove = fromRow < RIVER_ROW_START
  const toBelow = toRow > RIVER_ROW_END
  const toAbove = toRow < RIVER_ROW_START
  return (fromBelow && toAbove) || (fromAbove && toBelow)
}

/** Sample the straight line between two points — false if any sample hits water/terrain. */
export function isDirectPathWalkable(grid: Grid, from: Vec2, to: Vec2): boolean {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return isWorldWalkable(grid, from.x, from.y)

  const steps = Math.max(2, Math.ceil(len / (CELL_SIZE * 0.4)))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    if (!isWorldWalkable(grid, from.x + dx * t, from.y + dy * t)) return false
  }
  return true
}

/** Nearest bridge approach tile on the unit's side of the river, biased toward the goal. */
export function nearestBridgeApproach(grid: Grid, from: Vec2, goal: Vec2): Vec2 {
  const fromRow = worldRow(from.y)
  const approachRow = fromRow > RIVER_ROW_END
    ? RIVER_ROW_END + 1
    : RIVER_ROW_START - 1

  let bestCol: number = BRIDGE_COLS[0]
  let bestDist = Infinity
  for (const col of BRIDGE_COLS) {
    const bridge = grid.cellToWorld(col, approachRow)
    const d = Math.hypot(bridge.x - goal.x, bridge.y - goal.y)
    if (d < bestDist) {
      bestDist = d
      bestCol = col
    }
  }

  return grid.cellToWorld(bestCol, approachRow)
}

export function moveTowardDirect(pos: Vec2, target: Vec2, step: number): boolean {
  const dx = target.x - pos.x
  const dy = target.y - pos.y
  const d = Math.hypot(dx, dy)
  if (d < EPSILON_DISTANCE) return false
  const move = Math.min(step, d)
  pos.x += (dx / d) * move
  pos.y += (dy / d) * move
  return true
}

/** Full-speed movement along a pre-validated path, consuming leftover step budget across waypoints. */
export function followWaypoints(pos: Vec2, waypoints: Vec2[], finalGoal: Vec2, step: number): void {
  let budget = step

  while (budget > EPSILON_DISTANCE) {
    const target = waypoints[0] ?? finalGoal
    const dx = target.x - pos.x
    const dy = target.y - pos.y
    const d = Math.hypot(dx, dy)
    if (d < EPSILON_DISTANCE) {
      if (waypoints.length > 0) waypoints.shift()
      if (waypoints.length === 0 && reachedWorldPoint(pos, finalGoal)) break
      continue
    }

    const move = Math.min(budget, d)
    pos.x += (dx / d) * move
    pos.y += (dy / d) * move
    budget -= move

    if (reachedWorldPoint(pos, target)) {
      if (waypoints.length > 0) waypoints.shift()
    } else {
      break
    }
  }
}

export function reachedWorldPoint(pos: Vec2, target: Vec2, eps = WAYPOINT_EPS): boolean {
  const dx = target.x - pos.x
  const dy = target.y - pos.y
  return dx * dx + dy * dy <= eps * eps
}

