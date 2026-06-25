import { describe, it, expect } from 'vitest'
import { Grid } from './Grid'
import {
  isOppositeRiverBank,
  isDirectPathWalkable,
  nearestBridgeApproach,
} from './Movement'
import { CELL_SIZE, BRIDGE_COLS, RIGHT_BRIDGE_COLS } from '@data/GameConstants'

describe('Movement river navigation', () => {
  const grid = new Grid()

  it('detects opposite river banks', () => {
    const playerSide = { x: 240, y: 30 * CELL_SIZE }
    const botSide    = { x: 240, y: 10 * CELL_SIZE }
    expect(isOppositeRiverBank(playerSide, botSide)).toBe(true)
    expect(isOppositeRiverBank(playerSide, playerSide)).toBe(false)
  })

  it('direct path across river is not walkable', () => {
    const from = grid.cellToWorld(11, 30)
    const to   = grid.cellToWorld(11, 10)
    expect(isDirectPathWalkable(grid, from, to)).toBe(false)
  })

  it('direct path along same bank is walkable', () => {
    const from = grid.cellToWorld(11, 30)
    const to   = grid.cellToWorld(15, 35)
    expect(isDirectPathWalkable(grid, from, to)).toBe(true)
  })

  it('direct path through bridge column is walkable', () => {
    const bridgeCol = BRIDGE_COLS[0]!
    const from = grid.cellToWorld(bridgeCol, 30)
    const to   = grid.cellToWorld(bridgeCol, 10)
    expect(isDirectPathWalkable(grid, from, to)).toBe(true)
  })

  it('picks bridge approach biased toward goal', () => {
    const from = grid.cellToWorld(5, 30)
    const goal = grid.cellToWorld(18, 10)
    const approach = nearestBridgeApproach(grid, from, goal)
    // Goal is on the right — expect the nearer right-bridge column
    const rightCol = RIGHT_BRIDGE_COLS.reduce((best, c) =>
      Math.abs(goal.x - grid.cellToWorld(c, 0).x) < Math.abs(goal.x - grid.cellToWorld(best, 0).x) ? c : best)
    expect(approach.x).toBe(grid.cellToWorld(rightCol, 0).x)
  })
})
