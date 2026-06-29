import { describe, it, expect } from 'vitest'
import { isRangedAttacker, isMeleeAttacker } from '@core/CombatHelpers'
import { Troop } from '@core/entities/Troop'
import { Tower } from '@core/entities/Tower'
import { Building } from '@core/entities/Building'
import { Grid } from '@core/Grid'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { KING_TOWER } from '@data/TowerData'

const meleeStats: EntityStats = {
  maxHp: 100, speed: 1.5, damage: 50, attackRate: 1,
  attackRange: 1.2, unitType: UnitType.GROUND, attackType: AttackType.GROUND_ONLY,
}

const rangedStats: EntityStats = {
  maxHp: 100, speed: 2, damage: 30, attackRate: 1,
  attackRange: 5, unitType: UnitType.GROUND, attackType: AttackType.AIR_AND_GROUND,
}

describe('isRangedAttacker', () => {
  it('returns true for archer-like troops and towers', () => {
    const grid = new Grid()
    const archer = new Troop(Owner.PLAYER, rangedStats, { x: 100, y: 100 }, grid, 'elite_archer')
    const warrior = new Troop(Owner.PLAYER, meleeStats, { x: 100, y: 100 }, grid, 'warrior')
    const tower = new Tower(Owner.PLAYER, KING_TOWER, { x: 200, y: 200 })
    const building = new Building(Owner.PLAYER, rangedStats, { x: 300, y: 300 }, 'wood_tower')

    expect(isRangedAttacker(archer)).toBe(true)
    expect(isRangedAttacker(tower)).toBe(true)
    expect(isRangedAttacker(building)).toBe(true)
    expect(isRangedAttacker(warrior)).toBe(false)
    expect(isMeleeAttacker(warrior)).toBe(true)
    expect(isMeleeAttacker(archer)).toBe(false)
    expect(isMeleeAttacker(tower)).toBe(false)
  })
})
