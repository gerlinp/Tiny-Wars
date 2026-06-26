import { describe, it, expect } from 'vitest'
import {
  CR_SPEED,
  crSpeedToCellsPerSec,
  LEFT_BRIDGE_COLS,
  RIGHT_BRIDGE_COLS,
  LEFT_LANE_COL,
  RIGHT_LANE_COL,
  PLAYER_TOWER_COLS,
} from '@data/GameConstants'

describe('bridge placement', () => {
  it('aligns each bridge with its princess tower lane', () => {
    expect(LEFT_BRIDGE_COLS).toEqual([3, 4])
    expect(RIGHT_BRIDGE_COLS).toEqual([19, 20])
    expect(LEFT_LANE_COL).toBe(PLAYER_TOWER_COLS[0])
    expect(RIGHT_LANE_COL).toBe(PLAYER_TOWER_COLS[1])
  })
})

describe('crSpeedToCellsPerSec', () => {
  it('maps Medium (60) to 1.5 cells/sec', () => {
    expect(crSpeedToCellsPerSec(CR_SPEED.medium)).toBe(1.5)
  })

  it('maps Very Fast (120) to 3 cells/sec', () => {
    expect(crSpeedToCellsPerSec(CR_SPEED.veryFast)).toBe(3)
  })

  it('maps Fast (90) to 2.25 cells/sec', () => {
    expect(crSpeedToCellsPerSec(CR_SPEED.fast)).toBeCloseTo(2.25, 5)
  })
})
