/**
 * Hardcoded per-card ability values — each card's special mechanic baked in here,
 * not driven by generic EntityStats fields. Mirrors how CR works: each card's
 * special is its own code, not a configurable flag.
 */

// ---------------------------------------------------------------------------
// Gnoll (Executioner-style boomerang)
// ---------------------------------------------------------------------------
export const GNOLL_BOOMERANG_TRAVEL_CELLS = 7.5

// ---------------------------------------------------------------------------
// Thief (Bandit-style dash)
// ---------------------------------------------------------------------------
/** Max tiles away to dash in before each strike (beyond melee range). */
export const THIEF_DASH_RANGE_CELLS = 4
/** Pause (idle) before the leap — Bandit-style wind-up. */
export const THIEF_DASH_WINDUP_MS = 550
/** Fast leap across the gap; total dash time stays CR-like with the wind-up above. */
export const THIEF_DASH_SPEED_MULT = 8

// ---------------------------------------------------------------------------
// Lancer (Prince-style charge)
// ---------------------------------------------------------------------------
/** Clash Royale Prince — charge after this many tiles of walking. */
export const LANCER_CHARGE_DISTANCE_CELLS = 3.5
export const LANCER_CHARGE_SPEED_MULT = 2
export const LANCER_CHARGE_DAMAGE_MULT = 2

// ---------------------------------------------------------------------------
// Harpoon Shark (Fisherman-style hook)
// ---------------------------------------------------------------------------
/** Fisherman L14 — hook range and charge (Harpoon Shark card). */
export const HOOK_MIN_RANGE_CELLS = 3.5
export const HOOK_MAX_RANGE_CELLS = 7
export const HOOK_WINDUP_MS = 1300
export const HOOK_SLOW_DURATION_MS = 1500
export const HOOK_SLOW_SPEED_MULT = 0.65

// ---------------------------------------------------------------------------
// Goblin Demolisher (building-charge / kamikaze mode)
// ---------------------------------------------------------------------------
/** At or below this HP fraction, enter building-charge mode. */
export const GOBLIN_DEMOLISHER_CHARGE_HP_FRACTION = 0.5
/** Movement speed during building-charge mode (grid cells/sec). */
export const GOBLIN_DEMOLISHER_CHARGE_SPEED_CR = 120  // CR veryFast internal speed
/** Melee reach while charging buildings (grid cells). */
export const GOBLIN_DEMOLISHER_CHARGE_ATTACK_RANGE = 1.0

// ---------------------------------------------------------------------------
// Spider (Witch-style minion spawner)
// ---------------------------------------------------------------------------
export const SPIDER_MINION_CARD_ID = 'spiderling'
export const SPIDER_MINION_SPAWN_COUNT = 4
export const SPIDER_MINION_SPAWN_INTERVAL_MS = 7000
export const SPIDER_MINION_SPAWN_INITIAL_DELAY_MS = 1000

// ---------------------------------------------------------------------------
// Voodoo Shaman (Witch — spawns Skeletons)
// ---------------------------------------------------------------------------
export const VOODOO_SHAMAN_MINION_CARD_ID = 'skeleton'
export const VOODOO_SHAMAN_MINION_SPAWN_COUNT = 3
export const VOODOO_SHAMAN_MINION_SPAWN_INTERVAL_MS = 7000
export const VOODOO_SHAMAN_MINION_SPAWN_INITIAL_DELAY_MS = 1000

// ---------------------------------------------------------------------------
// Lightning Shaman (Electro Wizard — chains bolt to a second target)
// ---------------------------------------------------------------------------
export const LIGHTNING_SHAMAN_CHAIN_RANGE_PX = 5 * 64  // 5 cells in pixels

// ---------------------------------------------------------------------------
// Monk (Battle Healer-style attack heal + spawn heal)
// ---------------------------------------------------------------------------
export const MONK_HEAL_PER_PULSE = 34
export const MONK_HEAL_PULSE_COUNT = 4
export const MONK_HEAL_RADIUS = 4
export const MONK_SPAWN_HEAL_PER_PULSE = 67
export const MONK_SPAWN_HEAL_PULSE_COUNT = 4
export const MONK_SPAWN_HEAL_RADIUS = 2.5
