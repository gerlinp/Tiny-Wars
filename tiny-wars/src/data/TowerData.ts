import { AttackType } from '@core/types'

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

export const KING_TOWER: TowerDefinition = {
  id: 'king_tower',
  displayName: 'King Tower',
  maxHp: 2400,
  damage: 50,
  attackRate: 0.8,
  range: 7,
  attackType: AttackType.AIR_AND_GROUND,
  isKing: true,
}

export const PRINCESS_TOWER: TowerDefinition = {
  id: 'princess_tower',
  displayName: 'Princess Tower',
  maxHp: 1400,
  damage: 50,
  attackRate: 1.0,
  range: 8,
  attackType: AttackType.AIR_AND_GROUND,
  isKing: false,
}
