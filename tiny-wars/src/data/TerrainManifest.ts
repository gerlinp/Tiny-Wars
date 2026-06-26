/** Tiny Swords Tilemap_color1 — 64×64 tiles, 9×6 sheet (576×384). */

export const TERRAIN_TILE_PX = 64

export const TERRAIN_COLOR1 = {
  key: 'terrain_color1',
  path: 'assets/Terrain/Tileset/Tilemap_color1.png',
  frameWidth: TERRAIN_TILE_PX,
  frameHeight: TERRAIN_TILE_PX,
  sheetCols: 9,
  sheetRows: 6,
} as const

/** @deprecated alias — renderer uses TERRAIN_COLOR1 */
export const TERRAIN_GRASS = TERRAIN_COLOR1

export const TERRAIN_WATER = {
  key: 'terrain_water',
  path: 'assets/Terrain/Water/Water.png',
} as const

export const TERRAIN_BRIDGE = {
  key: 'terrain_bridge',
  path: 'assets/Terrain/Bridge/Bridge_All.png',
  frameWidth: TERRAIN_TILE_PX,
  frameHeight: TERRAIN_TILE_PX,
  sheetCols: 3,
  sheetRows: 4,
} as const

/** Row-major sheet frame index from pixel origin (x, y) on Tilemap_color1. */
export function sheetFrame(col: number, row: number): number {
  return row * TERRAIN_COLOR1.sheetCols + col
}

/**
 * Flat-ground autotile lookup (Tiny Swords guide).
 * Mask = (Nsame << 3) | (Esame << 2) | (Ssame << 1) | Wsame — land or bridge = same.
 */
export const FLAT_GROUND_LOOKUP: readonly number[] = [
  16, // 0000
  12, // 0001
  13, // 0010
  3,  // 0011
  10, // 0100
  11, // 0101
  1,  // 0110
  2,  // 0111
  15, // 1000
  9,  // 1001
  14, // 1010
  6,  // 1011
  7,  // 1100
  8,  // 1101
  4,  // 1110
  5,  // 1111
]

/** Semantic piece id → sheet frame (flat-ground region, cols 0–4). */
export const FLAT_GROUND_FRAMES: Readonly<Record<number, number>> = {
  1: sheetFrame(0, 0),
  2: sheetFrame(1, 0),
  3: sheetFrame(2, 0),
  4: sheetFrame(0, 1),
  5: sheetFrame(1, 1),
  6: sheetFrame(2, 1),
  7: sheetFrame(0, 2),
  8: sheetFrame(1, 2),
  9: sheetFrame(2, 2),
  10: sheetFrame(0, 3),
  11: sheetFrame(1, 3),
  12: sheetFrame(2, 3),
  13: sheetFrame(3, 0),
  14: sheetFrame(3, 1),
  15: sheetFrame(3, 2),
  16: sheetFrame(3, 3),
}

/** Grass-to-cliff lip pieces (elevated region) — bot-side river edge only. */
export const CLIFF_LIP_FRAMES: Readonly<Record<number, number>> = {
  7: sheetFrame(5, 2),
  8: sheetFrame(6, 2),
  9: sheetFrame(7, 2),
  16: sheetFrame(8, 3),
}

/** Cliff face terminating in water (drawn on the river cell below a south lip). */
export const CLIFF_WATER_FRAMES = {
  left: sheetFrame(5, 5),
  mid: sheetFrame(6, 5),
  right: sheetFrame(7, 5),
  narrow: sheetFrame(8, 5),
} as const

/** Center fill tile — flat-ground piece 5. */
export const GRASS_CENTER_FRAME = FLAT_GROUND_FRAMES[5]

/** Vertical bridge deck — 2 cols × 3 river rows within Bridge_All (3×4 sheet). */
export const BRIDGE_FRAME_MAP: readonly number[] = [
  0, 1,
  3, 4,
  6, 7,
]

export const TERRAIN_SHEETS = [TERRAIN_COLOR1, TERRAIN_BRIDGE] as const

/** Flat top-row grass edges — player-side river bank (pieces 1–3, sheet row 0). */
export const FLAT_TOP_EDGE_FRAMES = {
  left: FLAT_GROUND_FRAMES[1],
  mid: FLAT_GROUND_FRAMES[2],
  right: FLAT_GROUND_FRAMES[3],
} as const

export const CLIFF_LIP_PIECE_IDS = new Set([7, 8, 9, 16])
