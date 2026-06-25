export enum Owner { PLAYER = 0, BOT = 1 }

export enum UnitType { AIR = 'AIR', GROUND = 'GROUND' }

export enum AttackType {
  AIR_ONLY       = 'AIR_ONLY',
  GROUND_ONLY    = 'GROUND_ONLY',
  AIR_AND_GROUND = 'AIR_AND_GROUND',
}

export enum TroopState { WALKING = 'WALKING', ATTACKING = 'ATTACKING', DEAD = 'DEAD' }

export enum BuildingState { IDLE = 'IDLE', ATTACKING = 'ATTACKING' }

export enum CardType { TROOP = 'TROOP', SPELL = 'SPELL', BUILDING = 'BUILDING' }

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
}

export interface SpellStats {
  damage: number
  radius: number  // grid cells
  duration: number // ms, 0 = instant
  effect?: 'RAGE' | 'SLOW'
}

export interface CardDefinition {
  id: string
  displayName: string
  elixirCost: number
  cardType: CardType
  stats: EntityStats | SpellStats
  textureKeyPlayer: string  // Phaser texture key for player (Blue) version
  textureKeyBot: string     // Phaser texture key for bot (Red) version
}

export type GameEvent =
  | { type: 'DEPLOY';       entityId: string; cardId: string; position: Vec2 }
  | { type: 'DAMAGE'; targetId: string; amount: number; attackerId?: string }
  | { type: 'DEATH';        entityId: string; position: Vec2 }
  | { type: 'CROWN_LOST';   owner: Owner; towerId: string }
  | { type: 'SPELL_IMPACT'; cardId: string; position: Vec2; radius: number }

export interface BotAction {
  cardId: string
  position: Vec2
}
