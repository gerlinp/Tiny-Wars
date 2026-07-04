import {
  GRID_COLS,
  GRID_ROWS,
  RIVER_ROW_START,
  RIVER_ROW_END,
  LEFT_BRIDGE_COLS,
  RIGHT_BRIDGE_COLS,
  ARENA_FENCE_ROWS,
  ARENA_FENCE_COLS,
} from '@data/GameConstants'
import {
  FLAT_GROUND_LOOKUP,
  FLAT_GROUND_FRAMES,
  CLIFF_LIP_FRAMES,
  CLIFF_WATER_FRAMES,
  CLIFF_LIP_PIECE_IDS,
} from '@data/TerrainManifest'
import { getActiveMapConfig } from '@data/ActiveMapConfig'

export type TerrainCell = 'grass' | 'water' | 'bridge' | 'road'

/** True for the outermost border cells that form the arena moat (rendered as water). */
export function isBorderCell(col: number, row: number): boolean {
  return row < ARENA_FENCE_ROWS || row >= GRID_ROWS - ARENA_FENCE_ROWS
      || col < ARENA_FENCE_COLS || col >= GRID_COLS - ARENA_FENCE_COLS
}

export type GrassTilePlacement = {
  frame: number
  flipY: boolean
}

export type CliffOverlayPlacement = {
  frame: number
  flipY: boolean
}

const ALL_BRIDGE_COLS = [...LEFT_BRIDGE_COLS, ...RIGHT_BRIDGE_COLS] as const

export function isBridgeCol(col: number): boolean {
  const config = getActiveMapConfig()
  if (config) {
    return (config.leftBridgeCols as readonly number[]).includes(col)
        || (config.rightBridgeCols as readonly number[]).includes(col)
  }
  return (ALL_BRIDGE_COLS as readonly number[]).includes(col)
}

export function isRiverRow(row: number): boolean {
  const config = getActiveMapConfig()
  if (config) {
    return row >= config.riverRowStart && row <= config.riverRowEnd
  }
  return row >= RIVER_ROW_START && row <= RIVER_ROW_END
}

export function terrainCellAt(col: number, row: number): TerrainCell {
  const config = getActiveMapConfig()
  if (config) {
    const key = `${col},${row}`
    const override = config.terrainOverrides[key]
    if (override === 'water') return 'water'
    if (override === 'grass') return 'grass'
    // Roads only exist on land — river cells keep water/bridge semantics.
    if (override === 'road' && !isRiverRow(row)) return 'road'
  }
  if (isRiverRow(row)) {
    return isBridgeCol(col) ? 'bridge' : 'water'
  }
  return 'grass'
}

/**
 * Path frame in Tilemap_Flat (10-col sheet) for a road cell, from its road neighbours.
 * `sand` picks the right-hand variant (+5 cols). 1-wide runs use the strip pieces;
 * corners/junctions and lone cells use the isolated rounded tile.
 */
export function roadFlatFrame(col: number, row: number, sand: boolean): number {
  const road = (c: number, r: number) => terrainCellAt(c, r) === 'road'
  const n = road(col, row - 1)
  const e = road(col + 1, row)
  const s2 = road(col, row + 1)
  const w = road(col - 1, row)
  const base = sand ? 5 : 0

  const vertical = (n || s2) && !e && !w
  const horizontal = (e || w) && !n && !s2
  if (vertical) {
    if (n && s2) return 1 * 10 + base + 3   // vertical strip middle
    return (n ? 2 : 0) * 10 + base + 3      // bottom / top cap
  }
  if (horizontal) {
    if (e && w) return 3 * 10 + base + 1    // horizontal strip middle
    return 3 * 10 + base + (e ? 0 : 2)      // left / right cap
  }
  return 3 * 10 + base + 3                  // junction / lone cell — isolated tile
}

/**
 * Stone path frame in Tilemap_Elevation (4-col sheet). Vertical runs use the 1-wide
 * plateau strip (col 3); horizontal runs use the bottom ledge row; junctions use the
 * plateau centre tile.
 */
export function roadStoneFrame(_col: number, _row: number): number {
  // Flat path: every cell uses the plateau centre piece — no edge/ledge shading,
  // so the road reads as a flat stone surface rather than raised elevation.
  return 1 * 4 + 1
}

/** Land for autotile — grass or bridge; water and off-map are not land. */
export function isLandNeighbor(col: number, row: number): boolean {
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false
  const kind = terrainCellAt(col, row)
  return kind === 'grass' || kind === 'bridge' || kind === 'road'
}

function neighborMask(col: number, row: number): number {
  const n = isLandNeighbor(col, row - 1)
  const e = isLandNeighbor(col + 1, row)
  const s = isLandNeighbor(col, row + 1)
  const w = isLandNeighbor(col - 1, row)
  return (n ? 8 : 0) | (e ? 4 : 0) | (s ? 2 : 0) | (w ? 1 : 0)
}

function southNeighborIsWater(col: number, row: number): boolean {
  return terrainCellAt(col, row + 1) === 'water'
}

function flatPieceId(mask: number): number {
  return FLAT_GROUND_LOOKUP[mask & 0xf] ?? 5
}

function cliffLipFrame(pieceId: number): number {
  return CLIFF_LIP_FRAMES[pieceId] ?? CLIFF_LIP_FRAMES[8]
}

function flatGroundFrame(pieceId: number): number {
  return FLAT_GROUND_FRAMES[pieceId] ?? FLAT_GROUND_FRAMES[5]
}

/**
 * Grass tile frame.
 * Bot side (river to the south): cliff-lip pieces from the elevated region.
 * Player side (river to the north): flat top-row grass edges — the mirror of the cliff lips.
 */
export function grassTilePlacement(col: number, row: number): GrassTilePlacement {
  if (southNeighborIsWater(col, row)) {
    const pieceId = flatPieceId(neighborMask(col, row))
    if (CLIFF_LIP_PIECE_IDS.has(pieceId)) {
      return { frame: cliffLipFrame(pieceId), flipY: false }
    }
  }

  return { frame: flatGroundFrame(flatPieceId(neighborMask(col, row))), flipY: false }
}

/** Legacy helper — frame only, no flip. */
export function grassAutotileFrame(col: number, row: number): number {
  return grassTilePlacement(col, row).frame
}

function hasSouthCliffLip(col: number, row: number): boolean {
  return terrainCellAt(col, row) === 'grass' && southNeighborIsWater(col, row)
}

function waterCliffVariant(col: number, lipRow: number): number {
  const hasLeft = col > 0 && hasSouthCliffLip(col - 1, lipRow)
  const hasRight = col < GRID_COLS - 1 && hasSouthCliffLip(col + 1, lipRow)

  if (!hasLeft && !hasRight) return CLIFF_WATER_FRAMES.narrow
  if (!hasLeft) return CLIFF_WATER_FRAMES.left
  if (!hasRight) return CLIFF_WATER_FRAMES.right
  return CLIFF_WATER_FRAMES.mid
}

/** Cliff face overlay on water directly below a bot-side grass cliff lip. */
export function cliffOverlayAt(col: number, row: number): CliffOverlayPlacement | null {
  if (terrainCellAt(col, row) !== 'water') return null
  if (row > 0 && hasSouthCliffLip(col, row - 1)) {
    return { frame: waterCliffVariant(col, row - 1), flipY: false }
  }
  return null
}
