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

// River runs across rows 20–22 (0-indexed); only bridge columns are walkable through it
export const RIVER_ROW_START = 20
export const RIVER_ROW_END   = 22
export const BRIDGE_COLS     = [7, 16] as const

// Lane movement (matches Java HandleTroopsRunnable — cols 6/17 → 7/16, bridge row 6 → 21)
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

// Tower layout (grid rows, player at bottom, bot at top)
export const PLAYER_KING_ROW    = 39
export const PLAYER_KING_COL    = 11
export const PLAYER_TOWER_ROW   = 37
export const PLAYER_TOWER_COLS  = [4, 19] as const

export const BOT_KING_ROW   = 3
export const BOT_KING_COL   = 11
export const BOT_TOWER_ROW  = 5
export const BOT_TOWER_COLS = [4, 19] as const

// Deployment zones (player can only place in rows 23+; bot places in rows 0–19)
export const PLAYER_DEPLOY_ROW_MIN = 23
export const PLAYER_DEPLOY_ROW_MAX = GRID_ROWS - 1
export const BOT_DEPLOY_ROW_MIN    = 0
export const BOT_DEPLOY_ROW_MAX    = 19

// Bot AI think interval range (ms)
export const BOT_THINK_MIN_MS = 2000
export const BOT_THINK_MAX_MS = 5000

/** Default deployed building lifetime before auto-expiring */
export const BUILDING_LIFETIME_MS = 90_000

/** Melee troop detection radius (ranged troops use their attack range instead) */
export const TROOP_AGGRO_RANGE_CELLS = 6
