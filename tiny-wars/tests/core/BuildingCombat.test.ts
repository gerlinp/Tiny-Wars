import { describe, it, expect } from 'vitest'
import { Building } from '@core/entities/Building'
import { Troop } from '@core/entities/Troop'
import { Grid } from '@core/Grid'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import {
  edgeDistBetweenEntities,
  entityCollisionCenter,
  entityHalfExtents,
  meleeApproachPoint,
  surfaceDistToEntity,
} from '@core/EntityGeometry'
import { CARD_DEFINITIONS } from '@data/CardData'
import { GameSimulator } from '@core/GameSimulator'
import {
  CELL_SIZE,
  BUILDING_FOOTPRINT_CELLS,
} from '@data/GameConstants'
import { towerCombatRadius, buildingPlacementCombatRadiusPx } from '@rendering/assetDisplaySize'

const WOOD_TOWER_STATS: EntityStats = {
  maxHp: 1791,
  speed: 0,
  damage: 293,
  attackRate: 1 / 1.8,
  attackRange: 6.0,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
  splashRadius: 1.5,
  deathSplashRadius: 3,
  lifetimeMs: 40_000,
}

const warriorStats: EntityStats = {
  maxHp: 500,
  speed: 1.5,
  damage: 50,
  attackRate: 1,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

describe('Building CR combat hull', () => {
  const grid = new Grid()

  it('bomb tower uses princess-tower combat circle, not sprite dimensions', () => {
    const building = new Building(Owner.BOT, WOOD_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const half = entityHalfExtents(building)
    const princessR = towerCombatRadius(false)

    expect(building.combatRadiusPx).toBe(princessR)
    expect(half.halfW).toBe(princessR)
    expect(half.halfH).toBe(princessR)
  })

  it('bomb tower blocks a 2×2 path footprint while keeping princess combat hull', () => {
    const pos = { x: 300, y: 500 }
    const building = new Building(Owner.BOT, WOOD_TOWER_STATS, pos, 'wood_tower')

    expect(building.pathHalfW).toBe((BUILDING_FOOTPRINT_CELLS.w / 2) * CELL_SIZE)
    expect(building.blockedCells.length).toBe(4)
    expect(building.combatRadiusPx).toBe(towerCombatRadius(false))
  })

  it('bomb tower deploy preview ring matches princess combat hull', () => {
    expect(buildingPlacementCombatRadiusPx('wood_tower')).toBe(towerCombatRadius(false))
  })

  it('lets a deployed warrior melee a bomb tower via the simulator', () => {
    const sim = new GameSimulator(new Grid())
    const woodTower = CARD_DEFINITIONS.wood_tower!
    const warriorCard = CARD_DEFINITIONS.warrior!

    expect(sim.deployCard(Owner.BOT, woodTower, { x: 15, y: 18 })).toBe(true)
    expect(sim.deployCard(Owner.PLAYER, warriorCard, { x: 15, y: 23 })).toBe(true)

    const building = [...sim.state.entities.values()].find(e => e.cardId === 'wood_tower')!
    const beforeHp = building.hp

    for (let i = 0; i < 400 && building.hp === beforeHp; i++) {
      sim.tick(50)
    }

    expect(building.hp).toBeLessThan(beforeHp)
  })

  it('melee approach keeps 1.2 tile edge gap vs building combat circle', () => {
    const building = new Building(Owner.BOT, WOOD_TOWER_STATS, { x: 300, y: 500 }, 'wood_tower')
    const warrior = new Troop(Owner.PLAYER, warriorStats, { x: 300, y: 580 }, grid, 'warrior')
    const approach = meleeApproachPoint(warrior.position, warrior, building, 1.2)

    warrior.position.x = approach.x
    warrior.position.y = approach.y
    expect(edgeDistBetweenEntities(warrior, building)).toBeCloseTo(1.2 * CELL_SIZE - CELL_SIZE * 0.5, 0)
  })

  it('surface distance uses combat radius centred on deploy anchor', () => {
    const building = new Building(Owner.BOT, WOOD_TOWER_STATS, { x: 300, y: 500 }, 'wood_tower')
    const r = building.combatRadiusPx
    const center = entityCollisionCenter(building)
    const outside = { x: center.x + r + 30, y: center.y }

    expect(center).toEqual({ x: 300, y: 500 })
    expect(surfaceDistToEntity(outside, building)).toBeCloseTo(30, 0)
  })
})
