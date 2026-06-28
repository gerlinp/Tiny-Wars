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
  /** Death nova damage; defaults to {@link damage} when unset. */
  deathSplashDamage?: number
  /** Slow nearby enemies on death — speed multiplier (0.7 = 30% slower). */
  deathSlowSpeedMultiplier?: number
  /** How long the death slow lasts (ms). */
  deathSlowDurationMs?: number
  /** First successful strike deals multiplied damage (e.g. opening dash). */
  firstHitDamageMultiplier?: number
  /** Bandit-style — max tiles away to dash in on the first hit (must also set firstHitDamageMultiplier). */
  dashRangeCells?: number
  /** Speed multiplier while dashing to the target on the opening hit. */
  dashSpeedMultiplier?: number
  /** Ms to hold idle before the opening dash leap. */
  dashWindupMs?: number
  /** Prince-style charge — tiles walked before charge activates. */
  chargeDistanceCells?: number
  /** Speed multiplier while charging (e.g. 2 = double speed). */
  chargeSpeedMultiplier?: number
  /** Damage multiplier on the first hit while charging. */
  chargeDamageMultiplier?: number
  /** Giant-style — only acquires buildings and towers, never enemy troops. */
  targetsBuildingsOnly?: boolean
  /** Battle Healer-style — HP restored per pulse when attacking. */
  healPerPulse?: number
  /** Pulses per attack (default 4). */
  healPulseCount?: number
  /** Heal aura radius while attacking (grid cells). */
  healRadius?: number
  /** HP restored per pulse on deploy (spawn heal). */
  spawnHealPerPulse?: number
  /** Spawn-heal pulses on deploy (default 4). */
  spawnHealPulseCount?: number
  /** Spawn-heal radius on deploy (grid cells). */
  spawnHealRadius?: number
  /** Executioner-style — bone travels out and returns, damaging twice along the path. */
  boomerangAttack?: boolean
  /** Max travel distance for the boomerang (grid cells); defaults to ~7.5 for executioner-style. */
  boomerangTravelCells?: number
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
  /** Hidden — ISO ms when this card id first entered the collection (stable across renames). */
  addedAt: number
}

export type GameEvent =
  | { type: 'DEPLOY';       entityId: string; cardId: string; position: Vec2 }
  | { type: 'SPELL_CAST';  cardId: string; owner: Owner; from: Vec2; to: Vec2; flightMs: number; entityId: string }
  | { type: 'SPELL_IMPACT'; cardId: string; position: Vec2; radius: number }
  | { type: 'DAMAGE'; targetId: string; amount: number; attackerId?: string; splash?: boolean }
  | { type: 'HEAL'; targetId: string; amount: number; healerId?: string }
  | { type: 'HEAL_AURA'; position: Vec2; radius: number; owner: Owner; healerId?: string }
  | { type: 'BOOMERANG'; throwerId: string; owner: Owner; from: Vec2; dir: Vec2; travelLimitPx: number }
  | { type: 'DEATH'; entityId: string; position: Vec2; cardId?: string; deathSplashRadius?: number }
  | { type: 'CROWN_LOST';   owner: Owner; towerId: string }

export interface BotAction {
  cardId: string
  handIndex: number
  position: Vec2
}
