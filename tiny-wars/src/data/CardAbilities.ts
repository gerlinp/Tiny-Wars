/**
 * Hardcoded per-card ability values — each card's special mechanic baked in here,
 * not driven by generic EntityStats fields. Mirrors how CR works: each card's
 * special is its own code, not a configurable flag.
 */

// ---------------------------------------------------------------------------
// Gnoll (Executioner-style boomerang)
// ---------------------------------------------------------------------------
/** Slightly past Gnoll's 4.5-cell attack range — pierces just beyond the primary target,
 *  not the old 7.5 which sent it nearly double the attack range out. */
export const GNOLL_BOOMERANG_TRAVEL_CELLS = 5.0

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
// TNT Goblin (building-charge / kamikaze mode)
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
// Pig Shaman (CR Mother Witch — hits curse enemy troops; a cursed troop that
// dies from ANY source within the window respawns as the shaman's Pig)
// ---------------------------------------------------------------------------
export const PIG_SHAMAN_TRANSFORM_CARD_ID = 'pig'
/** How long the transformation hex lingers after a hit (CR Mother Witch: 5s). */
export const PIG_SHAMAN_CURSE_MS = 5000

// ---------------------------------------------------------------------------
// Snake (Electro Wizard — chains venom spray to a second target, stuns on hit)
// ---------------------------------------------------------------------------
export const SNAKE_CHAIN_RANGE_PX = 5 * 64  // 5 cells in pixels
/** Brief lock-up on every troop the venom hits — CR Electro Wizard-style stun. */
export const SNAKE_STUN_DURATION_MS = 500
/** CR Electro Wizard — deploy zap deals the same damage as a normal hit. */
export const SNAKE_SPAWN_ZAP_DAMAGE = 300
export const SNAKE_SPAWN_ZAP_RADIUS_CELLS = 1.5
/** Crown towers take spell-style reduced damage from the deploy zap. */
export const SNAKE_SPAWN_ZAP_TOWER_DAMAGE_MULT = 0.35

// ---------------------------------------------------------------------------
// Minotaur (Mega Knight-style spawn slam)
// ---------------------------------------------------------------------------
/** CR Mega Knight deploy damage — 2× attack damage (L11 444 × 1.321). */
export const MINOTAUR_SPAWN_SLAM_DAMAGE = 586
export const MINOTAUR_SPAWN_SLAM_RADIUS_CELLS = 2.0
/** Crown towers take spell-style reduced damage from the arrival slam. */
export const MINOTAUR_SPAWN_SLAM_TOWER_DAMAGE_MULT = 0.35
/** Jump attack — leaps at ground troops in this range band (grid cells). */
export const MINOTAUR_JUMP_MIN_RANGE_CELLS = 3.5
export const MINOTAUR_JUMP_MAX_RANGE_CELLS = 5.0
/** Crouch before the leap. */
export const MINOTAUR_JUMP_WINDUP_MS = 600
/** Airborne travel speed multiplier during the leap. */
export const MINOTAUR_JUMP_SPEED_MULT = 5
/** CR Mega Knight — jump landing deals 2× attack damage in the slam radius. */
export const MINOTAUR_JUMP_DAMAGE_MULT = 2
/** Drop-in height for the spawn jump — purely visual (grid cells). */
export const MINOTAUR_SPAWN_DROP_HEIGHT_CELLS = 4
/** Spawn drop lands 2× faster than a normal troop's spawn freeze (500ms) — a hard, abrupt slam. */
export const MINOTAUR_SPAWN_DROP_MS = 250

// ---------------------------------------------------------------------------
// Miner (deploys anywhere, burrows in, reduced crown tower damage)
// ---------------------------------------------------------------------------
/**
 * Digging/travel time before the Miner surfaces — untargetable and hidden underground.
 * Long enough that the dig-trail (king tower → deploy point, see BattleScene) reads as a
 * real tunnel crossing the map, not an instant blip.
 */
export const MINER_BURROW_MS = 2000
/** CR Miner — crown towers take ~40% of his normal hit damage. */
export const MINER_TOWER_DAMAGE_MULT = 0.4

// ---------------------------------------------------------------------------
// Monk (Battle Healer-style attack heal + spawn heal)
// ---------------------------------------------------------------------------
export const MONK_HEAL_PER_PULSE = 34
export const MONK_HEAL_PULSE_COUNT = 4
export const MONK_HEAL_RADIUS = 4
export const MONK_SPAWN_HEAL_PER_PULSE = 67
export const MONK_SPAWN_HEAL_PULSE_COUNT = 4
export const MONK_SPAWN_HEAL_RADIUS = 2.5
