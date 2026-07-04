export enum Owner { PLAYER = 0, BOT = 1 }

export enum UnitType { AIR = 'AIR', GROUND = 'GROUND' }

export enum AttackType {
  AIR_ONLY       = 'AIR_ONLY',
  GROUND_ONLY    = 'GROUND_ONLY',
  AIR_AND_GROUND = 'AIR_AND_GROUND',
}

export enum TroopState { SPAWNING = 'SPAWNING', WALKING = 'WALKING', ATTACKING = 'ATTACKING', DEAD = 'DEAD' }

export enum BuildingState { IDLE = 'IDLE', ATTACKING = 'ATTACKING' }

export enum CardType { TROOP = 'TROOP', BUILDING = 'BUILDING', ELIXIR = 'ELIXIR', SPELL = 'SPELL' }

export enum EntityKind { TROOP = 'TROOP', TOWER = 'TOWER', BUILDING = 'BUILDING', SPELL = 'SPELL' }

export interface Vec2 { x: number; y: number }

/** Target classes for {@link EntityStats.targetPriority}, ordered most-preferred first. */
export type TargetClass = 'troop' | 'building' | 'tower' | 'king'

/** Default acquisition order: enemy troops first, then buildings, then towers, then the king. */
export const DEFAULT_TARGET_PRIORITY: readonly TargetClass[] = ['troop', 'building', 'tower', 'king']

export interface EntityStats {
  maxHp: number
  speed: number       // grid cells per second
  damage: number
  attackRate: number  // attacks per second
  attackRange: number // in grid cells
  unitType: UnitType
  attackType: AttackType
  /** Buildings only — lifetime before auto-expiring (ms) */
  lifetimeMs?: number
  /** Wizard-style — damages all enemies within radius (grid cells) around the hit. */
  splashRadius?: number
  /** Bomb Tower — larger blast when the building is destroyed (grid cells). */
  deathSplashRadius?: number
  /** Death nova damage; defaults to {@link damage} when unset. */
  deathSplashDamage?: number
  /** Slow nearby enemies on death — speed multiplier (0.7 = 30% slower). */
  deathSlowSpeedMultiplier?: number
  /** How long the death slow lasts (ms). */
  deathSlowDurationMs?: number
  /** Only acquires buildings and towers, never enemy troops. */
  targetsBuildingsOnly?: boolean
  /**
   * Acquisition order by target class (most-preferred first). Defaults to
   * {@link DEFAULT_TARGET_PRIORITY} (troops, then structures). Deviates from Clash Royale,
   * which always picks the nearest valid target regardless of class.
   */
  targetPriority?: readonly TargetClass[]
  /** Dies immediately after dealing attack damage (e.g. wall-breaker dynamite). */
  suicideOnAttack?: boolean
  /** Extra HP pool absorbed before body HP (per unit) — displayed as Armor. */
  armorHp?: number
  /**
   * CR-style push weight — how strongly this unit displaces allies (and is displaced)
   * during collisions. Heavier units (Giant, Juggernaut) push lighter ones forward
   * even when moving at the same speed. Defaults to 1.0 when omitted.
   * Higher values = harder to displace and displaces others more.
   */
  pushWeight?: number
  /**
   * How far this unit can see enemy troops (grid cells). Defaults to
   * max(attackRange, TROOP_AGGRO_RANGE_CELLS). CR does not expose per-card sight
   * ranges; this default matches observed acquisition behavior and stays tunable.
   */
  sightRangeCells?: number
  /**
   * Troop-target leash — drop a locked troop target once it is pushed/flees beyond
   * this many cells. Defaults to sight range × COMBAT_LEASH_MULTIPLIER. Structure
   * targets never leash (CR: building-targeters commit until death).
   */
  targetRetentionRangeCells?: number
  /**
   * Grace period (ms) a troop target may stay beyond the retention range before it
   * is dropped. Defaults to RETARGET_GRACE_MS. CR's exact behavior is uncertain;
   * 0 = drop the tick it leaves the leash.
   */
  retargetGraceMs?: number
  /**
   * Body collision radius (grid cells). Small swarm units (skeletons) use a tighter
   * circle so they pack around targets instead of shoving each other. Defaults to
   * TROOP_COLLISION_RADIUS_CELLS.
   */
  collisionRadiusCells?: number
  /**
   * Delay between starting an attack and the damage landing (ms). CR calls this the
   * first-hit / load time. Defaults to 0 (instant hit, legacy behavior).
   */
  attackWindupMs?: number
  /**
   * Time after damage lands before the unit may move again (ms). Defaults to 0.
   * The attack cooldown still runs from the start of the swing.
   */
  attackRecoveryMs?: number
}

export interface SpellStats {
  damage: number
  radius: number  // grid cells
  duration: number // ms, 0 = instant
  effect?: 'RAGE' | 'SLOW'
  /** Rocket-style — skips air troops. */
  groundOnly?: boolean
  /** How the spell is delivered visually and timed. */
  delivery?: 'rocket' | 'arrows'
  /** Card id of the troop type to spawn at the impact point (Goblin Barrel style). */
  spawnCardId?: string
  /** Number of troops to spawn on impact (default 1 when spawnCardId is set). */
  spawnCount?: number
}

export interface CardDefinition {
  id: string
  displayName: string
  description: string
  elixirCost: number
  cardType: CardType
  /** Troops and buildings only */
  stats?: EntityStats
  /** Spell cards only */
  spellStats?: SpellStats
  /** Instant elixir cards — total elixir granted on play (before ELIXIR_MAX cap) */
  elixirGain?: number
  /** Troops only — units spawned per play (default 1). */
  deployCount?: number
  textureKeyPlayer: string
  textureKeyBot: string
  /** Hidden — ISO ms when this card id first entered the collection (stable across renames). */
  addedAt: number
}

export type GameEvent =
  | { type: 'DEPLOY';       entityId: string; cardId: string; position: Vec2 }
  | { type: 'SPELL_CAST';  cardId: string; owner: Owner; from: Vec2; to: Vec2; flightMs: number; entityId: string }
  | { type: 'SPELL_IMPACT'; cardId: string; position: Vec2; radius: number }
  | { type: 'DAMAGE'; targetId: string; amount: number; attackerId?: string; splash?: boolean; chainFrom?: Vec2 }
  | { type: 'HEAL'; targetId: string; amount: number; healerId?: string }
  | { type: 'HEAL_AURA'; position: Vec2; radius: number; owner: Owner; healerId?: string }
  | { type: 'BOOMERANG'; throwerId: string; owner: Owner; from: Vec2; dir: Vec2; travelLimitPx: number }
  | { type: 'HOOK'; hookId: string; throwerId: string; targetId: string; pullTroop: boolean }
  | { type: 'DEATH'; entityId: string; position: Vec2; cardId?: string; deathSplashRadius?: number }
  | { type: 'CROWN_LOST';   owner: Owner; towerId: string }

export interface BotAction {
  cardId: string
  handIndex: number
  position: Vec2
}
