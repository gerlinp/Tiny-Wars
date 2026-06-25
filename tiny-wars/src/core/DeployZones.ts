import { Owner } from './types'
import type { Vec2 } from './types'
import {
  GRID_COLS,
  GRID_ROWS,
  PLAYER_TOWER_COLS,
  DEPLOY_LANE_SPLIT_COL,
} from '@data/GameConstants'
import { enemyDeployRows, friendlyDeployRows } from './DeployPerspective'

export type TowerLane = 'left' | 'right'

export interface LaneUnlocks {
  left: boolean
  right: boolean
}

export const EMPTY_LANE_UNLOCKS: LaneUnlocks = { left: false, right: false }

export function createEmptyEnemyLaneDeploy(): Record<Owner, LaneUnlocks> {
  return {
    [Owner.PLAYER]: { ...EMPTY_LANE_UNLOCKS },
    [Owner.BOT]: { ...EMPTY_LANE_UNLOCKS },
  }
}

export function towerLaneFromCol(col: number): TowerLane {
  const midpoint = (PLAYER_TOWER_COLS[0] + PLAYER_TOWER_COLS[1]) / 2
  return col < midpoint ? 'left' : 'right'
}

export function isCellInLane(col: number, lane: TowerLane): boolean {
  if (lane === 'left') return col >= 0 && col < DEPLOY_LANE_SPLIT_COL
  return col >= DEPLOY_LANE_SPLIT_COL && col < GRID_COLS
}

/** True when a troop/building may be placed on this cell for the given owner. */
export function isTroopDeployCell(
  owner: Owner,
  gridPos: Vec2,
  enemyLaneDeploy: Record<Owner, LaneUnlocks>,
): boolean {
  const { x: col, y: row } = gridPos
  const friendly = friendlyDeployRows(owner)
  const enemy = enemyDeployRows(owner)
  const unlocks = enemyLaneDeploy[owner]

  if (row >= friendly.min && row <= friendly.max) return true
  if (row < enemy.min || row > enemy.max) return false
  if (unlocks.left && isCellInLane(col, 'left')) return true
  if (unlocks.right && isCellInLane(col, 'right')) return true
  return false
}

/** Enumerate valid deploy cells for troops/buildings (for bot AI). */
export function listTroopDeployCells(
  owner: Owner,
  enemyLaneDeploy: Record<Owner, LaneUnlocks>,
): Vec2[] {
  const cells: Vec2[] = []
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const pos = { x, y }
      if (isTroopDeployCell(owner, pos, enemyLaneDeploy)) {
        cells.push(pos)
      }
    }
  }
  return cells
}
