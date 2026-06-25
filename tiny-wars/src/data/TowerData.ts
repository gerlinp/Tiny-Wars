import { AttackType } from '@core/types'
import { BALANCE_REFERENCE_LEVEL } from '@data/GameConstants'

export interface TowerDefinition {
  id: string
  displayName: string
  maxHp: number
  damage: number
  attackRate: number  // attacks per second
  range: number       // grid cells
  attackType: AttackType
  isKing: boolean
}

/** Crown towers — Clash Royale stats at {@link BALANCE_REFERENCE_LEVEL}. */
export const KING_TOWER: TowerDefinition = {
  id: 'king_tower',
  displayName: 'King Tower',
  maxHp: 4824,
  damage: 109,
  attackRate: 1.0,
  range: 7,
  attackType: AttackType.AIR_AND_GROUND,
  isKing: true,
}

export const PRINCESS_TOWER: TowerDefinition = {
  id: 'princess_tower',
  displayName: 'Princess Tower',
  maxHp: 3052,
  damage: 109,
  attackRate: 1.25,
  range: 7.5,
  attackType: AttackType.AIR_AND_GROUND,
  isKing: false,
}
