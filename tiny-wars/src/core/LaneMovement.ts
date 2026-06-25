import {
  LEFT_LANE_COL, RIGHT_LANE_COL,
  RIVER_BRIDGE_ROW, BRIDGE_CENTER_COL,
} from '@data/GameConstants'
import { Owner } from './types'
import type { Vec2 } from './types'

/** Returns the next grid cell a ground troop should step toward (Java HandleTroopsRunnable logic). */
export function getLaneStep(col: number, row: number, owner: Owner): Vec2 {
  const towardEnemy = owner === Owner.PLAYER ? -1 : 1

  if (isOnMainPath(col, row)) {
    // Bridge row — converge horizontally toward centre, then cross
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

  // Off path — steer horizontally toward the nearer lane (correct direction)
  const leftDist  = Math.abs(col - LEFT_LANE_COL)
  const rightDist = Math.abs(col - RIGHT_LANE_COL)

  if (leftDist <= rightDist) {
    return { x: col + (col < LEFT_LANE_COL ? 1 : -1), y: row }
  }
  return { x: col + (col < RIGHT_LANE_COL ? 1 : -1), y: row }
}

export function isOnMainPath(col: number, row: number): boolean {
  return col === LEFT_LANE_COL ||
         col === RIGHT_LANE_COL ||
         row === RIVER_BRIDGE_ROW
}

/** Bridge centre tile — troops lock onto the enemy king here (Java y=6, x=9 equivalent). */
export function isBridgeCenter(col: number, row: number): boolean {
  return col === BRIDGE_CENTER_COL && row === RIVER_BRIDGE_ROW
}
