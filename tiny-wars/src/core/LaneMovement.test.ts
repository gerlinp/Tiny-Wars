import { describe, it, expect } from 'vitest'
import { getLaneStep, isOnMainPath, isBridgeCenter } from './LaneMovement'
import { Owner } from './types'
import {
  LEFT_LANE_COL, RIGHT_LANE_COL, RIVER_BRIDGE_ROW, BRIDGE_CENTER_COL,
} from '@data/GameConstants'

describe('LaneMovement', () => {
  it('player on left lane marches toward enemy (row decreases)', () => {
    const next = getLaneStep(LEFT_LANE_COL, 30, Owner.PLAYER)
    expect(next).toEqual({ x: LEFT_LANE_COL, y: 29 })
  })

  it('bot on right lane marches toward enemy (row increases)', () => {
    const next = getLaneStep(RIGHT_LANE_COL, 10, Owner.BOT)
    expect(next).toEqual({ x: RIGHT_LANE_COL, y: 11 })
  })

  it('off-path troop steers toward nearest lane (left of lane 7)', () => {
    const next = getLaneStep(10, 30, Owner.PLAYER)
    expect(next).toEqual({ x: 9, y: 30 })
  })

  it('off-path troop east of left lane moves right toward it, not left', () => {
    const next = getLaneStep(5, 30, Owner.PLAYER)
    expect(next).toEqual({ x: 6, y: 30 })
  })

  it('off-path troop west of right lane moves left toward it', () => {
    const next = getLaneStep(18, 30, Owner.PLAYER)
    expect(next).toEqual({ x: 17, y: 30 })
  })

  it('bridge row left half moves right toward centre', () => {
    const next = getLaneStep(LEFT_LANE_COL, RIVER_BRIDGE_ROW, Owner.PLAYER)
    expect(next).toEqual({ x: LEFT_LANE_COL + 1, y: RIVER_BRIDGE_ROW })
  })

  it('bridge row right half moves left toward centre', () => {
    const next = getLaneStep(RIGHT_LANE_COL, RIVER_BRIDGE_ROW, Owner.PLAYER)
    expect(next).toEqual({ x: RIGHT_LANE_COL - 1, y: RIVER_BRIDGE_ROW })
  })

  it('identifies main paths and bridge centre', () => {
    expect(isOnMainPath(LEFT_LANE_COL, 30)).toBe(true)
    expect(isOnMainPath(10, RIVER_BRIDGE_ROW)).toBe(true)
    expect(isOnMainPath(10, 30)).toBe(false)
    expect(isBridgeCenter(BRIDGE_CENTER_COL, RIVER_BRIDGE_ROW)).toBe(true)
  })
})
