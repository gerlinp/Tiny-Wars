import {
  LEFT_LANE_COL, RIGHT_LANE_COL,
  LEFT_BRIDGE_COLS, RIGHT_BRIDGE_COLS,
  RIVER_BRIDGE_ROW, BRIDGE_CENTER_COL,
  RIVER_ROW_START, RIVER_ROW_END, BRIDGE_COLS, CELL_SIZE, EPSILON_DISTANCE,
} from '@data/GameConstants'
import { Owner } from './types'
import type { Vec2 } from './types'

/** How far ahead (in cells) lane marching aims — avoids snapping to the next tile centre. */
const LANE_LOOKAHEAD_CELLS = 6

function isBridgeCol(col: number): boolean {
  return (BRIDGE_COLS as readonly number[]).includes(col)
}

function nearestLaneCol(col: number): number {
  const leftTarget = LEFT_BRIDGE_COLS.reduce((best, c) =>
    Math.abs(col - c) < Math.abs(col - best) ? c : best)
  const rightTarget = RIGHT_BRIDGE_COLS.reduce((best, c) =>
    Math.abs(col - c) < Math.abs(col - best) ? c : best)
  const leftDist  = Math.abs(col - leftTarget)
  const rightDist = Math.abs(col - rightTarget)
  return leftDist <= rightDist ? leftTarget : rightTarget
}

/** Returns the next grid cell a ground troop should step toward (Java HandleTroopsRunnable logic). */
export function getLaneStep(col: number, row: number, owner: Owner): Vec2 {
  const towardEnemy = owner === Owner.PLAYER ? -1 : 1
  const inRiver = row >= RIVER_ROW_START && row <= RIVER_ROW_END

  if (isOnMainPath(col, row)) {
    // Bridge columns are narrow — cross vertically; water blocks horizontal sidesteps.
    if (inRiver && isBridgeCol(col)) {
      return { x: col, y: row + towardEnemy }
    }

    // Bridge row between lanes — converge toward centre (land tiles only in our grid).
    if (row === RIVER_BRIDGE_ROW) {
      if (col >= LEFT_LANE_COL && col < BRIDGE_CENTER_COL) {
        return { x: col + 1, y: row }
      }
      if (col > BRIDGE_CENTER_COL && col <= RIGHT_LANE_COL) {
        return { x: col - 1, y: row }
      }
    }

    // On a lane column or bridge centre — march toward enemy
    return { x: col, y: row + towardEnemy }
  }

  // Off path — steer horizontally toward the nearer bridge/lane column
  const laneCol = nearestLaneCol(col)
  return { x: col + (col < laneCol ? 1 : -1), y: row }
}

export function isOnMainPath(col: number, row: number): boolean {
  return isBridgeCol(col) || row === RIVER_BRIDGE_ROW
}

/** First tile past the river on the king column — Java bridge-centre king lock equivalent. */
export function isBridgeCenter(col: number, row: number): boolean {
  return col === BRIDGE_CENTER_COL && row === RIVER_ROW_START - 1
}

/**
 * World-space march goal for smooth 360° movement along lanes.
 * Uses lane direction with lookahead instead of the adjacent cell centre.
 */
export function getLaneMarchGoal(
  worldX: number,
  worldY: number,
  owner: Owner,
  worldToCell: (wx: number, wy: number) => Vec2,
  cellToWorld: (col: number, row: number) => Vec2,
): Vec2 {
  const cell = worldToCell(worldX, worldY)

  if (!isOnMainPath(cell.x, cell.y)) {
    const laneCol = nearestLaneCol(cell.x)
    const laneWx = cellToWorld(laneCol, cell.y).x
    const towardEnemy = owner === Owner.PLAYER ? -1 : 1
    const ahead = CELL_SIZE * LANE_LOOKAHEAD_CELLS
    return { x: laneWx, y: worldY + towardEnemy * ahead }
  }

  const from = cellToWorld(cell.x, cell.y)
  const step = getLaneStep(cell.x, cell.y, owner)
  const to = cellToWorld(step.x, step.y)
  let dx = to.x - from.x
  let dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < EPSILON_DISTANCE) {
    dy = (owner === Owner.PLAYER ? -1 : 1) * CELL_SIZE
    dx = 0
  } else {
    dx /= len
    dy /= len
  }

  const ahead = CELL_SIZE * LANE_LOOKAHEAD_CELLS
  return { x: worldX + dx * ahead, y: worldY + dy * ahead }
}
