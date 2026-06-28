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
  /** Max tiles away to dash in before each strike when beyond melee range. */
  dashRangeCells?: number
  /** Speed multiplier while leaping to the target during a dash. */
  dashSpeedMultiplier?: number
  /** Ms to hold idle before each dash leap. */
  dashWindupMs?: number
  /** Prince-style charge — tiles walked before charge activates. */
  chargeDistanceCells?: number
  /** Speed multiplier while charging (e.g. 2 = double speed). */
  chargeSpeedMultiplier?: number
  /** Damage multiplier on the first hit while charging. */
  chargeDamageMultiplier?: number
  /** Only acquires buildings and towers, never enemy troops. */
  targetsBuildingsOnly?: boolean
  /** Dies immediately after dealing attack damage (e.g. wall-breaker dynamite). */
  suicideOnAttack?: boolean
  /** Battle Healer-style — HP restored per pulse when attacking. */
  healPerPulse?: number
  /** Extra HP pool absorbed before body HP (per unit) — displayed as Armor. */
  armorHp?: number
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
  /** Bone travels out and returns, damaging twice along the path. */
  boomerangAttack?: boolean
  /** Max travel distance for the boomerang (grid cells); defaults to ~7.5 for executioner-style. */
  boomerangTravelCells?: number
  /** Fisherman-style — charge then throw a hook to pull ground troops or reel toward buildings. */
  hookAttack?: boolean
  /** Minimum distance to throw the hook (grid cells). */
  hookMinRangeCells?: number
  /** Maximum hook reach (grid cells). */
  hookMaxRangeCells?: number
  /** Ms to charge before the hook flies. */
  hookWindupMs?: number
  /** Slow applied to hooked ground troops — speed multiplier (0.65 = 35% slower). */
  hookSlowSpeedMultiplier?: number
  /** How long the hook slow lasts (ms). */
  hookSlowDurationMs?: number
  /** Witch-style — card id of minions spawned periodically around the unit. */
  spawnMinionCardId?: string
  /** Minions per spawn wave (defaults to target card deployCount). */
  spawnMinionCount?: number
  /** Ms between minion spawn waves. */
  spawnMinionIntervalMs?: number
  /** Ms after deploy before the first minion wave. */
  spawnMinionInitialDelayMs?: number
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
  | { type: 'DAMAGE'; targetId: string; amount: number; attackerId?: string; splash?: boolean }
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
