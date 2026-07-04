import { describe, it, expect } from 'vitest'
import { Grid } from '@core/Grid'
import { Pathfinder } from '@core/Pathfinder'
import { UnitType } from '@core/types'
import { BRIDGE_COLS } from '@data/GameConstants'

function makePF() {
  return new Pathfinder(new Grid())
}

describe('Pathfinder', () => {
  it('returns empty path when start equals goal', () => {
    const pf = makePF()
    const path = pf.findPath({ x: 5, y: 5 }, { x: 5, y: 5 }, UnitType.GROUND)
    expect(path).toHaveLength(0)
  })

  it('air units get a direct single-waypoint path', () => {
    const pf = makePF()
    const path = pf.findPath({ x: 5, y: 40 }, { x: 15, y: 2 }, UnitType.AIR)
    expect(path).toHaveLength(1)
    expect(path[0]).toEqual({ x: 15, y: 2 })
  })

  it('ground unit finds path from bottom to top via bridge', () => {
    const pf = makePF()
    // Start: row 40, End: row 2 — must cross the river (rows 20–22)
    const bridgeCol = BRIDGE_COLS[0]
    const path = pf.findPath({ x: bridgeCol, y: 40 }, { x: bridgeCol, y: 2 }, UnitType.GROUND)
    expect(path.length).toBeGreaterThan(0)
    // Verify every cell in the path is walkable (no blocked river cells)
    const grid = new Grid()
    for (const cell of path) {
      expect(grid.isWalkable(cell.x, cell.y)).toBe(true)
    }
    // Final cell must be at the goal
    expect(path[path.length - 1]).toEqual({ x: bridgeCol, y: 2 })
  })

  it('ground unit cannot cross river outside bridge columns', () => {
    const grid = new Grid()
    // Column 10 is not a bridge — should be impassable through the river
    expect(grid.isWalkable(10, 15)).toBe(false)
    expect(grid.isWalkable(10, 16)).toBe(false)
  })

  it('bridge columns are walkable through the river', () => {
    const grid = new Grid()
    for (const col of BRIDGE_COLS) {
      expect(grid.isWalkable(col, 15)).toBe(true)
      expect(grid.isWalkable(col, 16)).toBe(true)
    }
  })
})
