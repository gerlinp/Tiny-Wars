import { describe, it, expect } from 'vitest'
import { Building } from './entities/Building'
import { Tower } from './entities/Tower'
import { Owner, UnitType, AttackType } from './types'
import type { EntityStats } from './types'
import {
  approachPointOnSurface,
  entityCollisionCenter,
  entityHalfExtents,
  gridCellsForFootprint,
  surfaceDistToEntity,
} from './EntityGeometry'
import { CELL_SIZE, TOWER_FOOTPRINT_CELLS, BOT_TOWER_ROW } from '@data/GameConstants'
import { KING_TOWER, PRINCESS_TOWER } from '@data/TowerData'
import { towerVisualBounds } from '@rendering/towerRenderPosition'

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

  it('surface distance is zero at deploy point and positive outside footprint', () => {
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

  it('princess tower collision matches official 3×3 tile footprint', () => {
    const tower = new Tower(Owner.PLAYER, PRINCESS_TOWER, { x: 100, y: 500 })
    const half = entityHalfExtents(tower)
    const fp = TOWER_FOOTPRINT_CELLS.princess

    expect(half.halfW).toBe((fp.w / 2) * CELL_SIZE)
    expect(half.halfH).toBe((fp.h / 2) * CELL_SIZE)
    expect(half.halfW).toBeLessThan(CELL_SIZE * 2)
  })

  it('king tower collision matches 4×4 tile footprint', () => {
    const tower = new Tower(Owner.PLAYER, KING_TOWER, { x: 240, y: 760 })
    const half = entityHalfExtents(tower)
    const fp = TOWER_FOOTPRINT_CELLS.king

    expect(half.halfW).toBe((fp.w / 2) * CELL_SIZE)
    expect(half.halfH).toBe((fp.h / 2) * CELL_SIZE)
  })

  it('bot tower melee approach stops at the footprint river edge', () => {
    const logicY = BOT_TOWER_ROW * CELL_SIZE + CELL_SIZE / 2
    const tower = new Tower(Owner.BOT, PRINCESS_TOWER, { x: 100, y: logicY })
    const half = entityHalfExtents(tower)
    const riverEdge = logicY + half.halfH
    const approach = approachPointOnSurface({ x: 100, y: logicY + 180 }, tower)

    expect(approach.y).toBeGreaterThan(riverEdge - 5)
    expect(approach.y).toBeLessThan(riverEdge + 12)
  })

  it('player tower melee approach from the river stops at the north footprint edge', () => {
    const logicY = 35 * CELL_SIZE + CELL_SIZE / 2
    const tower = new Tower(Owner.PLAYER, PRINCESS_TOWER, { x: 100, y: logicY })
    const half = entityHalfExtents(tower)
    const riverEdge = logicY - half.halfH
    const approach = approachPointOnSurface({ x: 100, y: logicY - 180 }, tower)

    expect(approach.y).toBeGreaterThan(riverEdge - 12)
    expect(approach.y).toBeLessThan(riverEdge + 5)
  })

  it('bot and player tower footprints mirror on the grid around logic centres', () => {
    const botLogicY = BOT_TOWER_ROW * CELL_SIZE + CELL_SIZE / 2
    const playerLogicY = 35 * CELL_SIZE + CELL_SIZE / 2
    const bot = new Tower(Owner.BOT, PRINCESS_TOWER, { x: 100, y: botLogicY })
    const player = new Tower(Owner.PLAYER, PRINCESS_TOWER, { x: 100, y: playerLogicY })
    const half = entityHalfExtents(bot)

    const botCenter = entityCollisionCenter(bot)
    const playerCenter = entityCollisionCenter(player)

    expect(botCenter.y).toBe(botLogicY)
    expect(playerCenter.y).toBe(playerLogicY)
    expect(botCenter.y + half.halfH).toBeCloseTo(towerVisualBounds(botLogicY, Owner.BOT, false).riverEdge, 0)
    expect(playerCenter.y - half.halfH).toBeCloseTo(towerVisualBounds(playerLogicY, Owner.PLAYER, false).riverEdge, 0)
  })

  it('melee surface distance to princess tower uses grid footprint not sprite size', () => {
    const logicY = BOT_TOWER_ROW * CELL_SIZE + CELL_SIZE / 2
    const tower = new Tower(Owner.BOT, PRINCESS_TOWER, { x: 100, y: logicY })
    const half = entityHalfExtents(tower)
    const center = entityCollisionCenter(tower)
    const outside = { x: 100, y: center.y + half.halfH + 25 }

    expect(surfaceDistToEntity(outside, tower)).toBeCloseTo(25, 0)
  })
})
