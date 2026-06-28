import { describe, it, expect } from 'vitest'
import { Grid } from '@core/Grid'
import {
  isOppositeRiverBank,
  isDirectPathWalkable,
  nearestBridgeApproach,
} from '@core/Movement'
import { CELL_SIZE, BRIDGE_COLS, LEFT_BRIDGE_COLS, RIGHT_BRIDGE_COLS } from '@data/GameConstants'

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

  it('crosses at the bridge on the unit own side, not the goal side', () => {
    // Left-side unit with a right-side goal must still take the LEFT bridge (CR rule).
    const from = grid.cellToWorld(5, 30)
    const goal = grid.cellToWorld(18, 10)
    const approach = nearestBridgeApproach(grid, from, goal)
    const approachCol = Math.round(approach.x / CELL_SIZE - 0.5)
    expect(LEFT_BRIDGE_COLS).toContain(approachCol)
  })

  it('right-side unit takes the right bridge', () => {
    const from = grid.cellToWorld(20, 30)
    const goal = grid.cellToWorld(12, 6)
    const approach = nearestBridgeApproach(grid, from, goal)
    const approachCol = Math.round(approach.x / CELL_SIZE - 0.5)
    expect(RIGHT_BRIDGE_COLS).toContain(approachCol)
  })
})
