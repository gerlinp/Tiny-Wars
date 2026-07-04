import { describe, it, expect, afterEach } from 'vitest'
import { Grid } from '@core/Grid'
import { FlowField } from '@core/FlowField'
import { NAV_TERRAIN_COST, CELL_SIZE } from '@data/GameConstants'
import { setActiveMapConfig, getActiveMapConfig } from '@data/ActiveMapConfig'
import { DEFAULT_MAP_CONFIG } from '@data/DefaultMapConfig'

const prev = getActiveMapConfig()

function withRoadColumn(col: number, rowStart: number, rowEnd: number) {
  const terrainOverrides: Record<string, 'water' | 'grass' | 'road'> = {}
  for (let row = rowStart; row <= rowEnd; row++) {
    terrainOverrides[`${col},${row}`] = 'road'
  }
  setActiveMapConfig({ ...DEFAULT_MAP_CONFIG, terrainOverrides })
}

afterEach(() => {
  setActiveMapConfig(prev ?? DEFAULT_MAP_CONFIG)
})

describe('road-weighted navigation', () => {
  it('roads cost less than grass in the nav grid', () => {
    withRoadColumn(8, 20, 24)
    const grid = new Grid()
    expect(grid.navCostMultiplierAt(8, 22)).toBe(NAV_TERRAIN_COST.road)
    expect(grid.navCostMultiplierAt(7, 22)).toBe(NAV_TERRAIN_COST.grass)
  })

  it('flow field costs are lower along a road corridor', () => {
    // Goal at (8, 20); compare cost of reaching it from (8, 24)
    // with and without a road running down column 8.
    setActiveMapConfig({ ...DEFAULT_MAP_CONFIG, terrainOverrides: {} })
    const plainField = new FlowField(new Grid(), [{ x: 8, y: 20 }])
    const plainCost = plainField.costAt(8.5 * CELL_SIZE, 24.5 * CELL_SIZE)

    withRoadColumn(8, 20, 24)
    const roadField = new FlowField(new Grid(), [{ x: 8, y: 20 }])
    const roadCost = roadField.costAt(8.5 * CELL_SIZE, 24.5 * CELL_SIZE)

    expect(roadCost).toBeLessThan(plainCost)
  })

  it('grass-only maps keep legacy uniform costs', () => {
    setActiveMapConfig({ ...DEFAULT_MAP_CONFIG, terrainOverrides: {} })
    const grid = new Grid()
    expect(grid.navCostMultiplierAt(5, 20)).toBe(1)
    expect(grid.navCostMultiplierAt(3, 16)).toBe(NAV_TERRAIN_COST.bridge)
  })
})
