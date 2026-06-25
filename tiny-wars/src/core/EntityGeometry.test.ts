import { describe, it, expect } from 'vitest'
import { Building } from './entities/Building'
import { Owner, UnitType, AttackType } from './types'
import type { EntityStats } from './types'
import {
  approachPointOnSurface,
  gridCellsForFootprint,
  surfaceDistToEntity,
} from './EntityGeometry'
import { CELL_SIZE } from '@data/GameConstants'

const WOOD_TOWER_STATS: EntityStats = {
  maxHp: 800,
  speed: 0,
  damage: 210,
  attackRate: 1.5,
  attackRange: 6.0,
  unitType: UnitType.GROUND,
  attackType: AttackType.AIR_AND_GROUND,
}

describe('EntityGeometry', () => {
  it('wood tower blocks multiple grid cells matching its image footprint', () => {
    const pos = { x: 11 * CELL_SIZE + CELL_SIZE / 2, y: 25 * CELL_SIZE + CELL_SIZE / 2 }
    const building = new Building(Owner.PLAYER, WOOD_TOWER_STATS, pos, 'wood_tower')

    expect(building.blockedCells.length).toBeGreaterThan(1)
    expect(building.halfW).toBeGreaterThan(CELL_SIZE / 2)
  })

  it('surface distance is zero at building center and positive outside footprint', () => {
    const pos = { x: 200, y: 500 }
    const building = new Building(Owner.PLAYER, WOOD_TOWER_STATS, pos, 'wood_tower')

    expect(surfaceDistToEntity(pos, building)).toBe(0)
    expect(surfaceDistToEntity({ x: pos.x + building.halfW + 20, y: pos.y }, building)).toBeGreaterThan(15)
  })

  it('approach point stops outside building surface', () => {
    const pos = { x: 200, y: 500 }
    const building = new Building(Owner.BOT, WOOD_TOWER_STATS, pos, 'wood_tower')
    const from = { x: pos.x + 200, y: pos.y }
    const approach = approachPointOnSurface(from, building)

    const distToCenter = Math.hypot(approach.x - pos.x, approach.y - pos.y)
    expect(distToCenter).toBeGreaterThanOrEqual(building.halfW - 1)
    expect(distToCenter).toBeLessThan(building.halfW + 10)
  })

  it('gridCellsForFootprint covers cells intersecting the box', () => {
    const center = { x: 230, y: 510 }
    const cells = gridCellsForFootprint(center, 76, 76)
    expect(cells.length).toBeGreaterThanOrEqual(9)
  })
})
