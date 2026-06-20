export const GRID_COLS = 24
export const GRID_ROWS = 43

// Each grid cell in pixels
export const CELL_SIZE = 20

export const GAME_WIDTH  = GRID_COLS * CELL_SIZE  // 480
export const GAME_HEIGHT = GRID_ROWS * CELL_SIZE  // 860 (≈854 canvas height)

// River runs across rows 20–22 (0-indexed); only bridge columns are walkable through it
export const RIVER_ROW_START = 20
export const RIVER_ROW_END   = 22
export const BRIDGE_COLS     = [7, 16] as const

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
