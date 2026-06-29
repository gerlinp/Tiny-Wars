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

/** Crown towers — Clash Royale stats at {@link BALANCE_REFERENCE_LEVEL} (level 14).
 *  L11→L14 multiplier ×1.321: Princess 3052→4032, King 4824→6373, DMG 109→144.
 *  Attack speed and range do not change with tower level in CR. */
export const KING_TOWER: TowerDefinition = {
  id: 'king_tower',
  displayName: 'King Tower',
  maxHp: 6373,
  damage: 144,
  attackRate: 1.0,
  range: 18,
  attackType: AttackType.AIR_AND_GROUND,
  isKing: true,
}

export const PRINCESS_TOWER: TowerDefinition = {
  id: 'princess_tower',
  displayName: 'Princess Tower',
  maxHp: 4032,
  damage: 144,
  attackRate: 1.25,
  range: 7.5,
  attackType: AttackType.AIR_AND_GROUND,
  isKing: false,
}
