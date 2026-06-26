import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { resolve } from 'path'
import {
  RIVER_ROW_START,
  RIVER_ROW_END,
  LEFT_BRIDGE_COLS,
  RIGHT_BRIDGE_COLS,
} from '@data/GameConstants'
import {
  GRASS_CENTER_FRAME,
  CLIFF_LIP_FRAMES,
  CLIFF_WATER_FRAMES,
  FLAT_TOP_EDGE_FRAMES,
  TERRAIN_COLOR1,
  TERRAIN_WATER,
  TERRAIN_BRIDGE,
} from '@data/TerrainManifest'
import {
  terrainCellAt,
  grassTilePlacement,
  cliffOverlayAt,
  bridgeFrameIndex,
} from '@rendering/TerrainMap'

const PUBLIC = resolve(import.meta.dirname, '../../public')

describe('terrain assets', () => {
  it('terrain sprite paths exist on disk', () => {
    for (const path of [TERRAIN_COLOR1.path, TERRAIN_WATER.path, TERRAIN_BRIDGE.path]) {
      expect(existsSync(resolve(PUBLIC, path)), path).toBe(true)
    }
  })
})

describe('terrainCellAt', () => {
  it('classifies river, bridge, and grass from grid constants', () => {
    expect(terrainCellAt(10, 10)).toBe('grass')
    expect(terrainCellAt(0, 10)).toBe('grass')          // border cols are walkable-grass (trees placed over them)
    expect(terrainCellAt(10, 0)).toBe('grass')          // border rows same
    expect(terrainCellAt(10, RIVER_ROW_START)).toBe('water')
    expect(terrainCellAt(LEFT_BRIDGE_COLS[0], RIVER_ROW_START)).toBe('bridge')
    expect(terrainCellAt(RIGHT_BRIDGE_COLS[1], RIVER_ROW_END)).toBe('bridge')
  })
})

describe('grass autotile at river edge', () => {
  const rowAboveRiver = RIVER_ROW_START - 1
  const rowBelowRiver = RIVER_ROW_END + 1

  it('uses south cliff lip when grass sits directly above the river', () => {
    const tile = grassTilePlacement(10, rowAboveRiver)
    expect(tile.flipY).toBe(false)
    expect(tile.frame).toBe(CLIFF_LIP_FRAMES[8])
  })

  it('uses flat top-row grass edge when grass sits directly below the river', () => {
    const tile = grassTilePlacement(10, rowBelowRiver)
    expect(tile.flipY).toBe(false)
    expect(tile.frame).toBe(FLAT_TOP_EDGE_FRAMES.mid)
  })

  it('uses center fill in the interior away from the river', () => {
    const tile = grassTilePlacement(10, 10)
    expect(tile.frame).toBe(GRASS_CENTER_FRAME)
    expect(tile.flipY).toBe(false)
  })
})

describe('cliffOverlayAt', () => {
  it('draws water cliff face on the river row below a south lip', () => {
    const overlay = cliffOverlayAt(10, RIVER_ROW_START)
    expect(overlay).not.toBeNull()
    expect(overlay!.frame).toBe(CLIFF_WATER_FRAMES.mid)
    expect(overlay!.flipY).toBe(false)
  })

  it('does not draw cliff face on player-side river row (flat grass edge only)', () => {
    expect(cliffOverlayAt(10, RIVER_ROW_END)).toBeNull()
  })

  it('skips bridge columns', () => {
    expect(cliffOverlayAt(LEFT_BRIDGE_COLS[0], RIVER_ROW_START)).toBeNull()
  })
})

describe('bridgeFrameIndex', () => {
  it('maps each bridge column and river row to a deck frame', () => {
    expect(bridgeFrameIndex(LEFT_BRIDGE_COLS[0], RIVER_ROW_START)).toBe(0)
    expect(bridgeFrameIndex(LEFT_BRIDGE_COLS[1], RIVER_ROW_START)).toBe(1)
    expect(bridgeFrameIndex(RIGHT_BRIDGE_COLS[0], RIVER_ROW_END)).toBe(6)
    expect(bridgeFrameIndex(RIGHT_BRIDGE_COLS[1], RIVER_ROW_END)).toBe(7)
  })
})
