export const GRID_COLS = 24
export const GRID_ROWS = 43

/** Minimum world-space distance treated as effectively zero in movement and collision checks. */
export const EPSILON_DISTANCE = 0.01

/** Water border at each edge of the arena — non-walkable moat matching the river aesthetic. */
export const ARENA_FENCE_ROWS = 1
export const ARENA_FENCE_COLS = 1

// Each grid cell in pixels
export const CELL_SIZE = 20

// Map display scale — relative to visible unit height (matches Tiny Swords reference art)
export const MAP_UNIT_TARGET_HEIGHT = CELL_SIZE * 2.5

/** Height multipliers vs a knight's visible height (reference proportions) */
export const MAP_HEIGHT_MULTIPLIER = {
  troop:           1.0,
  building:        2.2,
  tower_princess:  3.5,
  tower_king:      2.5,  // composite castle sprite (whole base, not a single tower)
} as const

/** Fraction of texture height that is visible art (rest is transparent padding in sprite sheets) */
export const MAP_TOWER_CONTENT_FILL = {
  tower_princess: 0.90,
  tower_king:     0.88,
} as const

export const GAME_WIDTH  = GRID_COLS * CELL_SIZE  // 480
export const GAME_HEIGHT = GRID_ROWS * CELL_SIZE  // 860 — arena only
export const HUD_HEIGHT  = 140
export const CANVAS_HEIGHT = GAME_HEIGHT + HUD_HEIGHT  // 1000 — must match GameConfig height

// Tower layout — princess towers at river bank, king castle well behind (CR style)
export const PLAYER_KING_ROW    = 37
export const PLAYER_KING_COL    = 11
export const PLAYER_TOWER_ROW   = 27
export const PLAYER_TOWER_COLS  = [4, 19] as const

export const BOT_KING_ROW   = 6
export const BOT_KING_COL   = 11
export const BOT_TOWER_ROW  = 15
export const BOT_TOWER_COLS = [4, 19] as const

/** Left lane bridge — tower column is the king-side (right) cell of the pair. */
function bridgeColsOnLeftTowerLane(towerCol: number): readonly [number, number] {
  return [towerCol - 1, towerCol] as const
}

/** Right lane bridge — tower column is the king-side (left) cell of the pair (mirror of left). */
function bridgeColsOnRightTowerLane(towerCol: number): readonly [number, number] {
  return [towerCol, towerCol + 1] as const
}

// River runs across rows 20–22 (0-indexed); bridge columns are walkable through it
export const RIVER_ROW_START = 20
export const RIVER_ROW_END   = 22
/** Each bridge sits on its princess tower lane — CPU marches straight to player tower. */
export const LEFT_BRIDGE_COLS  = bridgeColsOnLeftTowerLane(PLAYER_TOWER_COLS[0])
export const RIGHT_BRIDGE_COLS = bridgeColsOnRightTowerLane(PLAYER_TOWER_COLS[1])
export const BRIDGE_COLS = [...LEFT_BRIDGE_COLS, ...RIGHT_BRIDGE_COLS] as const

// Lane movement — one vertical lane per princess tower column
export const LEFT_LANE_COL     = PLAYER_TOWER_COLS[0]
export const RIGHT_LANE_COL    = PLAYER_TOWER_COLS[1]
export const RIVER_BRIDGE_ROW  = 21   // middle river row — horizontal bridge crossing
export const BRIDGE_CENTER_COL = PLAYER_KING_COL

// Game duration
export const GAME_DURATION_MS = 180_000  // 3 minutes

// Elixir
export const ELIXIR_MAX      = 10
export const ELIXIR_START    = 4
export const ELIXIR_REGEN_MS = 2800   // ms per +1 elixir
export const ELIXIR_FAST_MS  = 1400   // ms per +1 elixir in last 60 seconds
export const ELIXIR_FAST_AT  = 60_000 // switch to fast regen when time_remaining <= this

/**
 * Arena tile footprints (official CR: princess 3×3; king ~4×4 diameter per placement guides).
 * Collision uses grid cells, not rendered sprite bounds.
 */
export const TOWER_FOOTPRINT_CELLS = {
  princess: { w: 3, h: 3 },
  king:     { w: 4, h: 4 },
} as const

export function towerFootprintHalfExtents(isKing: boolean): { halfW: number; halfH: number } {
  const fp = isKing ? TOWER_FOOTPRINT_CELLS.king : TOWER_FOOTPRINT_CELLS.princess
  return {
    halfW: (fp.w / 2) * CELL_SIZE,
    halfH: (fp.h / 2) * CELL_SIZE,
  }
}

/** Princess-only sprite shift toward the river (visual only; hitboxes unchanged). */
export const PRINCESS_TOWER_RENDER_NUDGE_Y = {
  player: -48,
  bot: 0,
} as const

// Deployment zones — exclude fence border rows from valid placement
export const PLAYER_DEPLOY_ROW_MIN = 23
export const PLAYER_DEPLOY_ROW_MAX = GRID_ROWS - 1 - ARENA_FENCE_ROWS  // 41
export const BOT_DEPLOY_ROW_MIN    = ARENA_FENCE_ROWS                   // 1
export const BOT_DEPLOY_ROW_MAX    = 19

/** Princess-lane split — left tower unlocks cols [0, split); right unlocks [split, GRID_COLS). */
export const DEPLOY_LANE_SPLIT_COL = 12

// Bot AI think interval range (ms)
export const BOT_THINK_MIN_MS = 2000
export const BOT_THINK_MAX_MS = 5000

/** Clash Royale card level used for troop/building/spell stat references.
 *  Level 14 = Arena 26 "Royal Road" (~10,500 trophies) baseline.
 *  Towers and cards scale at ~9.7%/level; L11→L14 multiplier ≈ ×1.321. */
export const BALANCE_REFERENCE_LEVEL = 14

/** Official Clash Royale movement tiers (internal speed units). */
export const CR_SPEED = {
  verySlow: 45,
  slow: 55,
  medium: 60,
  fast: 90,
  veryFast: 120,
} as const

/** Grid cells/sec for a Medium (60) troop — anchor for {@link crSpeedToCellsPerSec}. */
export const CR_MEDIUM_SPEED_CELLS_PER_SEC = 1.5

/** Convert a Clash Royale movement speed to our grid cells per second. */
export function crSpeedToCellsPerSec(crSpeed: number): number {
  return crSpeed * (CR_MEDIUM_SPEED_CELLS_PER_SEC / CR_SPEED.medium)
}

/** Horizontal spacing between multi-deploy troops (e.g. Archers). */
export const TROOP_DEPLOY_SPREAD_CELLS = 0.9

/** Default deployed building lifetime before auto-expiring */
export const BUILDING_LIFETIME_MS = 90_000

/** Clash Royale Bomb Tower — 30s lifetime */
export const BOMB_TOWER_LIFETIME_MS = 30_000

/** Melee troop detection radius (ranged troops use their attack range instead) */
export const TROOP_AGGRO_RANGE_CELLS = 6

/** Ground troop body box width vs display height (feet-level collision). */
export const TROOP_COLLISION_WIDTH_RATIO = 0.38

/** Ground troop body box depth vs display height (feet-level collision). */
export const TROOP_COLLISION_HEIGHT_RATIO = 0.22
