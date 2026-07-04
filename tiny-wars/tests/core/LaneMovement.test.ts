import { describe, it, expect } from 'vitest'
import { getLaneStep, isOnMainPath, isBridgeCenter, getLaneMarchGoal } from '@core/LaneMovement'
import { Owner } from '@core/types'
import {
  LEFT_LANE_COL, RIGHT_LANE_COL, LEFT_BRIDGE_COLS,
  RIVER_BRIDGE_ROW, BRIDGE_CENTER_COL, RIVER_ROW_START, CELL_SIZE,
} from '@data/GameConstants'
import { Grid } from '@core/Grid'

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
    // col 8 is closer to left lane (col 3, dist 5) than right lane (col 14, dist 6)
    const next = getLaneStep(8, 30, Owner.PLAYER)
    expect(next).toEqual({ x: 7, y: 30 })
  })

  it('off-path troop east of left lane moves left toward it', () => {
    // cols 2–4 are the left bridge; col 5 is the first genuinely off-path column
    const next = getLaneStep(5, 30, Owner.PLAYER)
    expect(next).toEqual({ x: 4, y: 30 })
  })

  it('off-path troop between bridges steers toward nearest lane', () => {
    // col 10 is closer to right lane (col 14, dist 4) than left lane (col 3, dist 7)
    const next = getLaneStep(10, 30, Owner.PLAYER)
    expect(next).toEqual({ x: 11, y: 30 })
  })

  it('bridge column crosses river vertically instead of sidestepping into water', () => {
    expect(getLaneStep(LEFT_LANE_COL, RIVER_BRIDGE_ROW, Owner.PLAYER))
      .toEqual({ x: LEFT_LANE_COL, y: RIVER_BRIDGE_ROW - 1 })
    expect(getLaneStep(RIGHT_LANE_COL, RIVER_BRIDGE_ROW, Owner.BOT))
      .toEqual({ x: RIGHT_LANE_COL, y: RIVER_BRIDGE_ROW + 1 })
  })

  it('bridge row between lanes still converges toward centre on land', () => {
    // cols 5–12 are between the two bridges and converge toward center col 9
    expect(getLaneStep(6, RIVER_BRIDGE_ROW, Owner.PLAYER))
      .toEqual({ x: 7, y: RIVER_BRIDGE_ROW })
    expect(getLaneStep(12, RIVER_BRIDGE_ROW, Owner.PLAYER))
      .toEqual({ x: 11, y: RIVER_BRIDGE_ROW })
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
    const wx = 8 * CELL_SIZE + CELL_SIZE / 2
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
