export const GRID_COLS = 24
export const GRID_ROWS = 43

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

// River runs across rows 20–22 (0-indexed); bridge columns are walkable through it
export const RIVER_ROW_START = 20
export const RIVER_ROW_END   = 22
/** Two tiles wide per bridge — matches Clash Royale standard arenas (2/18 width). */
export const LEFT_BRIDGE_COLS  = [6, 7] as const
export const RIGHT_BRIDGE_COLS = [16, 17] as const
export const BRIDGE_COLS = [...LEFT_BRIDGE_COLS, ...RIGHT_BRIDGE_COLS] as const

// Lane movement — primary march column is the inner edge of each bridge (toward king)
export const LEFT_LANE_COL     = 7
export const RIGHT_LANE_COL    = 16
export const RIVER_BRIDGE_ROW  = 21   // middle river row — horizontal bridge crossing
export const BRIDGE_CENTER_COL = 11   // king tower column — convergence point

// Game duration
export const GAME_DURATION_MS = 180_000  // 3 minutes

// Elixir
export const ELIXIR_MAX      = 10
export const ELIXIR_START    = 4
export const ELIXIR_REGEN_MS = 2800   // ms per +1 elixir
export const ELIXIR_FAST_MS  = 1400   // ms per +1 elixir in last 60 seconds
export const ELIXIR_FAST_AT  = 60_000 // switch to fast regen when time_remaining <= this

// Tower layout — nudged 2 rows toward river vs original (37/39 player, 5/3 bot)
export const PLAYER_KING_ROW    = 37
export const PLAYER_KING_COL    = 11
export const PLAYER_TOWER_ROW   = 35
export const PLAYER_TOWER_COLS  = [4, 19] as const

export const BOT_KING_ROW   = 5
export const BOT_KING_COL   = 11
export const BOT_TOWER_ROW  = 7
export const BOT_TOWER_COLS = [4, 19] as const

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
  bot: 40,
} as const

// Deployment zones (player can only place in rows 23+; bot places in rows 0–19)
export const PLAYER_DEPLOY_ROW_MIN = 23
export const PLAYER_DEPLOY_ROW_MAX = GRID_ROWS - 1
export const BOT_DEPLOY_ROW_MIN    = 0
export const BOT_DEPLOY_ROW_MAX    = 19

/** Princess-lane split — left tower unlocks cols [0, split); right unlocks [split, GRID_COLS). */
export const DEPLOY_LANE_SPLIT_COL = 12

// Bot AI think interval range (ms)
export const BOT_THINK_MIN_MS = 2000
export const BOT_THINK_MAX_MS = 5000

/** Clash Royale card level used for troop/building/spell stat references. */
export const BALANCE_REFERENCE_LEVEL = 11

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
