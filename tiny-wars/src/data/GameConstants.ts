export const GRID_COLS = 24
export const GRID_ROWS = 43

/** Minimum world-space distance treated as effectively zero in movement and collision checks. */
export const EPSILON_DISTANCE = 0.01

/** Arena border — visual moat in terrain; also trims deploy zones (pathfinding grid stays fully open). */
export const ARENA_FENCE_ROWS = 1
export const ARENA_FENCE_COLS = 1

// Each grid cell in pixels — 64 renders terrain at native 64×64 and troops near-native 192×192
export const CELL_SIZE = 64

// Map display scale — relative to visible unit height (matches Tiny Swords reference art)
export const MAP_UNIT_TARGET_HEIGHT = CELL_SIZE * 2.5

// Visual-only scale applied to rendered sprites; does NOT affect collision or game logic
export const SPRITE_VISUAL_SCALE = 1.35

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

export const GAME_WIDTH  = GRID_COLS * CELL_SIZE  // 1536
export const GAME_HEIGHT = GRID_ROWS * CELL_SIZE  // 2752 — arena only
export const HUD_HEIGHT  = 560
export const CANVAS_HEIGHT = GAME_HEIGHT + HUD_HEIGHT  // 3312 — must match GameConfig height

// Tower hitbox anchors (map.json overrides — combat, pathing, targeting)
export const PLAYER_KING_ROW    = 39
/** Half-cell offset on 24-col grid — logic X lands on true map centre (768px). */
export const PLAYER_KING_COL    = 11.5
export const PLAYER_TOWER_ROW   = 30
export const PLAYER_TOWER_COLS  = [4, 19] as const

export const BOT_KING_ROW   = 3
export const BOT_KING_COL   = 11.5
export const BOT_TOWER_ROW  = 12
export const BOT_TOWER_COLS = [4, 19] as const

/** King logic anchor is already at map centre — no render nudge. */
export const KING_SPRITE_CENTER_OFFSET_X = 0
export const KING_MAP_CENTER_X = (GRID_COLS * CELL_SIZE) / 2

/** King castle art — visual-only rows (sprites/garrison stay here when hitbox row differs). */
export const PLAYER_KING_VISUAL_ROW = 36
export const BOT_KING_VISUAL_ROW    = 6

/** King-tower garrison cannon — map grid row on the visible castle deck. */
export const PLAYER_KING_CANNON_ROW = 37
export const BOT_KING_CANNON_ROW = 5

/** Walkable bridge columns through the river — 7-wide, centred on each princess lane. */
export const BRIDGE_SPAN = 7
const BRIDGE_RADIUS = Math.floor(BRIDGE_SPAN / 2)

function bridgeColsOnTowerLane(towerCol: number): readonly number[] {
  return Array.from({ length: BRIDGE_SPAN }, (_, i) => towerCol - BRIDGE_RADIUS + i)
}

// River runs across rows 20–22 (0-indexed); bridge columns are walkable through it
export const RIVER_ROW_START = 20
export const RIVER_ROW_END   = 22
/** Each bridge sits on its princess tower lane — CPU marches straight to player tower. */
export const LEFT_BRIDGE_COLS  = bridgeColsOnTowerLane(PLAYER_TOWER_COLS[0])
export const RIGHT_BRIDGE_COLS = bridgeColsOnTowerLane(PLAYER_TOWER_COLS[1])
export const BRIDGE_COLS = [...LEFT_BRIDGE_COLS, ...RIGHT_BRIDGE_COLS] as const

// Lane movement — one vertical lane per princess tower column
export const LEFT_LANE_COL     = PLAYER_TOWER_COLS[0]
export const RIGHT_LANE_COL    = PLAYER_TOWER_COLS[1]
export const RIVER_BRIDGE_ROW  = 21   // middle river row — horizontal bridge crossing
/** Integer column on bridge row where lanes converge (between cols 11 & 12). */
export const BRIDGE_CENTER_COL = 12

// Game duration
export const GAME_DURATION_MS = 180_000  // 3 minutes

// Elixir
export const ELIXIR_MAX      = 10
export const ELIXIR_START    = 5
export const ELIXIR_REGEN_MS = 2800   // ms per +1 elixir
export const ELIXIR_FAST_MS  = 1400   // ms per +1 elixir in last 60 seconds of regulation
export const ELIXIR_TRIPLE_MS = 900   // ms per +1 elixir in overtime (~CR triple rate)
export const ELIXIR_FAST_AT  = 60_000 // switch to fast regen when time_remaining <= this

/** Overtime when regulation ends tied — first crown wins; triple elixir. */
export const OVERTIME_DURATION_MS = 120_000  // 2 minutes

/** After overtime expires tied — all towers drain until one falls (CR tiebreaker). */
export const TIE_BREAK_TOWER_DPS = 60  // damage per second to each remaining tower

/** Monk / Battle Healer — delay between each heal pulse in a burst (CR ~0.25s). */
export const HEAL_PULSE_INTERVAL_MS = 250

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
  player: -152,
  bot: 0,
} as const

/** Tower health bar placement — Clash Royale style (see layout-editor.html). */
export const TOWER_HEALTH_BAR_Y = {
  /** Bot bar centre: px above sprite top (smaller = closer to tower) */
  botGapAboveTop: 12,
  /** Player bar centre: px below sprite centre (+ = lower on tower toward HUD) */
  playerOffsetFromCenter: 24,
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

/** Clash Royale-style spawn freeze — unit idles this long before moving or attacking. */
export const TROOP_SPAWN_DELAY_MS = 500

/** Horizontal spacing between multi-deploy troops (e.g. Archers). */
export const TROOP_DEPLOY_SPREAD_CELLS = 0.9

/** Default deployed building lifetime before auto-expiring */
export const BUILDING_LIFETIME_MS = 90_000

/** Clash Royale Bomb Tower — 30s lifetime */
export const BOMB_TOWER_LIFETIME_MS = 30_000

/** Melee troop detection radius (ranged troops use their attack range instead) */
export const TROOP_AGGRO_RANGE_CELLS = 6

/** How far beyond attack range a unit can be pushed before it drops its current target.
 *  1.0 = drop immediately at edge of range; 2.0 = hold until twice attack range away. */
export const COMBAT_LEASH_MULTIPLIER = 2.0

/** Ground troop feet collision — small circle (CR-style), not sprite-sized boxes. */
export const TROOP_COLLISION_RADIUS_CELLS = 0.35

/** Deployed building combat hull — CR non-spawner buildings use ~0.6 tiles. */
export const BUILDING_COMBAT_RADIUS_CELLS = 0.6

/** Grid cells blocked for pathfinding (separate from combat circle). */
export const BUILDING_FOOTPRINT_CELLS = { w: 2, h: 2 } as const

/** Deployable bomb tower — same path/combat hull as a princess tower. */
export const BOMB_TOWER_CARD_ID = 'wood_tower'

/** @deprecated Used only for building footprint sizing in assetDisplaySize. */
export const TROOP_COLLISION_WIDTH_RATIO = 0.38

/** @deprecated Used only for building footprint sizing in assetDisplaySize. */
export const TROOP_COLLISION_HEIGHT_RATIO = 0.22
