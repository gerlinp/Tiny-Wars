import { describe, it, expect } from 'vitest'
import { getLaneStep, isOnMainPath, isBridgeCenter, getLaneMarchGoal } from './LaneMovement'
import { Owner } from './types'
import {
  LEFT_LANE_COL, RIGHT_LANE_COL, LEFT_BRIDGE_COLS,
  RIVER_BRIDGE_ROW, BRIDGE_CENTER_COL, RIVER_ROW_START, CELL_SIZE,
} from '@data/GameConstants'
import { Grid } from './Grid'

function gridHelpers() {
  const grid = new Grid()
  return {
    worldToCell: (wx: number, wy: number) => grid.worldToCell(wx, wy),
    cellToWorld: (col: number, row: number) => grid.cellToWorld(col, row),
  }
}

describe('LaneMovement', () => {
  it('player on left lane marches toward enemy (row decreases)', () => {
    const next = getLaneStep(LEFT_LANE_COL, 30, Owner.PLAYER)
    expect(next).toEqual({ x: LEFT_LANE_COL, y: 29 })
  })

  it('bot on right lane marches toward enemy (row increases)', () => {
    const next = getLaneStep(RIGHT_LANE_COL, 10, Owner.BOT)
    expect(next).toEqual({ x: RIGHT_LANE_COL, y: 11 })
  })

  it('off-path troop steers toward nearest lane (right of left lane)', () => {
    const next = getLaneStep(10, 30, Owner.PLAYER)
    expect(next).toEqual({ x: 9, y: 30 })
  })

  it('off-path troop east of left lane moves left toward it', () => {
    // col 5 is now part of the 3-wide left bridge, so use a genuinely off-path column
    const next = getLaneStep(7, 30, Owner.PLAYER)
    expect(next).toEqual({ x: 6, y: 30 })
  })

  it('off-path troop east of right lane moves left toward it', () => {
    const next = getLaneStep(21, 30, Owner.PLAYER)
    expect(next).toEqual({ x: 20, y: 30 })
  })

  it('bridge column crosses river vertically instead of sidestepping into water', () => {
    expect(getLaneStep(LEFT_LANE_COL, RIVER_BRIDGE_ROW, Owner.PLAYER))
      .toEqual({ x: LEFT_LANE_COL, y: RIVER_BRIDGE_ROW - 1 })
    expect(getLaneStep(RIGHT_LANE_COL, RIVER_BRIDGE_ROW, Owner.BOT))
      .toEqual({ x: RIGHT_LANE_COL, y: RIVER_BRIDGE_ROW + 1 })
  })

  it('bridge row between lanes still converges toward centre on land', () => {
    expect(getLaneStep(6, RIVER_BRIDGE_ROW, Owner.PLAYER))
      .toEqual({ x: 7, y: RIVER_BRIDGE_ROW })
    expect(getLaneStep(15, RIVER_BRIDGE_ROW, Owner.PLAYER))
      .toEqual({ x: 14, y: RIVER_BRIDGE_ROW })
  })

  it('outer bridge column crosses vertically like inner lane', () => {
    expect(getLaneStep(LEFT_BRIDGE_COLS[0]!, RIVER_BRIDGE_ROW, Owner.PLAYER))
      .toEqual({ x: LEFT_BRIDGE_COLS[0]!, y: RIVER_BRIDGE_ROW - 1 })
  })

  it('march goal looks ahead on lane instead of snapping to the next cell', () => {
    const { worldToCell, cellToWorld } = gridHelpers()
    const wx = LEFT_LANE_COL * CELL_SIZE + CELL_SIZE / 2
    const wy = 30 * CELL_SIZE + CELL_SIZE / 2
    const goal = getLaneMarchGoal(wx, wy, Owner.PLAYER, worldToCell, cellToWorld)
    const nextCell = cellToWorld(LEFT_LANE_COL, 29)

    expect(goal.y).toBeLessThan(wy - CELL_SIZE * 2)
    expect(goal.y).not.toBe(nextCell.y)
  })

  it('off-path march goal steers diagonally toward the lane ahead', () => {
    const { worldToCell, cellToWorld } = gridHelpers()
    const wx = 10 * CELL_SIZE + CELL_SIZE / 2
    const wy = 30 * CELL_SIZE + CELL_SIZE / 2
    const goal = getLaneMarchGoal(wx, wy, Owner.PLAYER, worldToCell, cellToWorld)

    expect(goal.x).toBe(cellToWorld(LEFT_LANE_COL, 30).x)
    expect(goal.y).toBeLessThan(wy)
  })

  it('identifies main paths and bridge centre', () => {
    expect(isOnMainPath(LEFT_LANE_COL, 30)).toBe(true)
    expect(isOnMainPath(LEFT_BRIDGE_COLS[0]!, 30)).toBe(true)
    expect(isOnMainPath(10, RIVER_BRIDGE_ROW)).toBe(true)
    expect(isOnMainPath(10, 30)).toBe(false)
    expect(isBridgeCenter(BRIDGE_CENTER_COL, RIVER_ROW_START - 1)).toBe(true)
  })
})
