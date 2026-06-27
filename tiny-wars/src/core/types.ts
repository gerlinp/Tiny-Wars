export enum Owner { PLAYER = 0, BOT = 1 }

export enum UnitType { AIR = 'AIR', GROUND = 'GROUND' }

export enum AttackType {
  AIR_ONLY       = 'AIR_ONLY',
  GROUND_ONLY    = 'GROUND_ONLY',
  AIR_AND_GROUND = 'AIR_AND_GROUND',
}

export enum TroopState { WALKING = 'WALKING', ATTACKING = 'ATTACKING', DEAD = 'DEAD' }

export enum BuildingState { IDLE = 'IDLE', ATTACKING = 'ATTACKING' }

export enum CardType { TROOP = 'TROOP', BUILDING = 'BUILDING', ELIXIR = 'ELIXIR', SPELL = 'SPELL' }

export enum EntityKind { TROOP = 'TROOP', TOWER = 'TOWER', BUILDING = 'BUILDING', SPELL = 'SPELL' }

export interface Vec2 { x: number; y: number }

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
  /** Prince-style charge — tiles walked before charge activates. */
  chargeDistanceCells?: number
  /** Speed multiplier while charging (e.g. 2 = double speed). */
  chargeSpeedMultiplier?: number
  /** Damage multiplier on the first hit while charging. */
  chargeDamageMultiplier?: number
  /** Giant-style — only acquires buildings and towers, never enemy troops. */
  targetsBuildingsOnly?: boolean
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
}

export type GameEvent =
  | { type: 'DEPLOY';       entityId: string; cardId: string; position: Vec2 }
  | { type: 'SPELL_CAST';  cardId: string; owner: Owner; from: Vec2; to: Vec2; flightMs: number; entityId: string }
  | { type: 'SPELL_IMPACT'; cardId: string; position: Vec2; radius: number }
  | { type: 'DAMAGE'; targetId: string; amount: number; attackerId?: string; splash?: boolean }
  | { type: 'DEATH'; entityId: string; position: Vec2; cardId?: string; deathSplashRadius?: number }
  | { type: 'CROWN_LOST';   owner: Owner; towerId: string }

export interface BotAction {
  cardId: string
  handIndex: number
  position: Vec2
}
