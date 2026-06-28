import type { Owner, EntityKind, EntityStats, SpellStats, Vec2 } from '../types'
import type { TowerDefinition } from '@data/TowerData'
import type { GameState } from '../GameState'

let _nextId = 0
export function nextEntityId(): string { return `e${++_nextId}` }

export abstract class Entity {
  readonly id: string
  readonly owner: Owner
  readonly kind: EntityKind
  position: Vec2
  hp: number
  readonly maxHp: number
  readonly cardId?: string
  hasBeenDamaged = false
  abstract readonly stats: EntityStats | TowerDefinition | SpellStats

  constructor(id: string, owner: Owner, kind: EntityKind, position: Vec2, maxHp: number, cardId?: string) {
    this.id       = id
    this.owner    = owner
    this.kind     = kind
    this.cardId   = cardId
    this.position = { ...position }
    this.maxHp    = maxHp
    this.hp       = maxHp
  }

  get isAlive(): boolean { return this.hp > 0 }

  takeDamage(amount: number): void {
    if (amount > 0) this.hasBeenDamaged = true
    this.hp = Math.max(0, this.hp - amount)
  }

  /** Restore HP up to maxHp — returns amount actually healed. */
  heal(amount: number): number {
    const before = this.hp
    this.hp = Math.min(this.maxHp, this.hp + amount)
    return this.hp - before
  }

  abstract tick(deltaMs: number, state: GameState): void
}
