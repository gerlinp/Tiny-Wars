import { describe, it, expect } from 'vitest'
import { Building } from '@core/entities/Building'
import { Tower } from '@core/entities/Tower'
import { Troop } from '@core/entities/Troop'
import { Grid } from '@core/Grid'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import {
  approachPointOnSurface,
  edgeDistBetweenEntities,
  entityCollisionCenter,
  entityHalfExtents,
  gridCellsForFootprint,
  meleeApproachPoint,
  surfaceDistToEntity,
  troopCollisionRadius,
} from '@core/EntityGeometry'
import {
  CELL_SIZE,
  BUILDING_FOOTPRINT_CELLS,
  TOWER_FOOTPRINT_CELLS,
  BOT_TOWER_ROW,
  TROOP_COLLISION_RADIUS_CELLS,
} from '@data/GameConstants'
import { KING_TOWER, PRINCESS_TOWER } from '@data/TowerData'
import { towerCombatRadius, towerDisplaySizeForNative } from '@rendering/assetDisplaySize'

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
  it('uses a small circular radius for troop collision', () => {
    const grid = new Grid()
    const troop = new Troop(Owner.PLAYER, {
      maxHp: 500,
      speed: 1.5,
      damage: 50,
      attackRate: 1,
      attackRange: 1.2,
      unitType: UnitType.GROUND,
      attackType: AttackType.GROUND_ONLY,
    }, { x: 100, y: 100 }, grid, 'warrior')

    expect(troopCollisionRadius(troop)).toBe(TROOP_COLLISION_RADIUS_CELLS * CELL_SIZE)
    expect(troopCollisionRadius(troop)).toBeLessThan(CELL_SIZE)
  })

  it('wood tower uses standard building footprint with princess combat circle', () => {
    const pos = { x: 11 * CELL_SIZE + CELL_SIZE / 2, y: 25 * CELL_SIZE + CELL_SIZE / 2 }
    const building = new Building(Owner.PLAYER, WOOD_TOWER_STATS, pos, 'wood_tower')

    expect(building.blockedCells.length).toBe(4)
    expect(building.pathHalfW).toBe((BUILDING_FOOTPRINT_CELLS.w / 2) * CELL_SIZE)
    expect(building.combatRadiusPx).toBe(towerCombatRadius(false))
  })

  it('surface distance is zero on combat hull and positive outside', () => {
    const pos = { x: 200, y: 500 }
    const building = new Building(Owner.PLAYER, WOOD_TOWER_STATS, pos, 'wood_tower')
    const center = entityCollisionCenter(building)

    expect(surfaceDistToEntity(center, building)).toBeCloseTo(0, 0)
    expect(surfaceDistToEntity({ x: center.x + building.combatRadiusPx + 20, y: center.y }, building))
      .toBeCloseTo(20, 0)
  })

  it('approach point stops outside building combat circle', () => {
    const pos = { x: 200, y: 500 }
    const building = new Building(Owner.BOT, WOOD_TOWER_STATS, pos, 'wood_tower')
    const from = { x: pos.x + 200, y: pos.y }
    const approach = approachPointOnSurface(from, building)
    const center = entityCollisionCenter(building)

    const distToCenter = Math.hypot(approach.x - center.x, approach.y - center.y)
    expect(distToCenter).toBeGreaterThanOrEqual(building.combatRadiusPx - 1)
    expect(distToCenter).toBeLessThan(building.combatRadiusPx + 10)
  })

  it('gridCellsForFootprint covers cells intersecting the box', () => {
    const center = { x: 230, y: 510 }
    const cells = gridCellsForFootprint(center, 76, 76)
    expect(cells.length).toBeGreaterThanOrEqual(9)
  })

  it('princess tower combat hull is a circle flush with footprint width', () => {
    const tower = new Tower(Owner.PLAYER, PRINCESS_TOWER, { x: 100, y: 500 })
    const half = entityHalfExtents(tower)
    const fp = TOWER_FOOTPRINT_CELLS.princess
    const r = towerCombatRadius(false)

    expect(r).toBe((fp.w / 2) * CELL_SIZE)
    expect(half.halfW).toBe(r)
    expect(half.halfH).toBe(half.halfW)
  })

  it('king tower combat hull is a circle matching rendered sprite width', () => {
    const tower = new Tower(Owner.PLAYER, KING_TOWER, { x: 240, y: 760 })
    const half = entityHalfExtents(tower)
    const r = towerCombatRadius(true)
    const spriteR = towerDisplaySizeForNative(true).width / 2

    expect(r).toBe(spriteR)
    expect(half.halfW).toBe(r)
    expect(half.halfH).toBe(half.halfW)
    expect(r).toBeGreaterThan(towerCombatRadius(false))
  })

  it('melee edge distance shrinks as units move closer', () => {
    const pos = { x: 200, y: 500 }
    const building = new Building(Owner.PLAYER, WOOD_TOWER_STATS, pos, 'wood_tower')
    const center = entityCollisionCenter(building)
    const far = { x: center.x + building.combatRadiusPx + 32, y: center.y }

    expect(edgeDistBetweenEntities(building, building)).toBe(0)
    expect(surfaceDistToEntity(far, building)).toBeCloseTo(32, 0)
  })

  it('lancer melee standoff keeps 1.6 tile edge gap vs princess tower', () => {
    const logicY = BOT_TOWER_ROW * CELL_SIZE + CELL_SIZE / 2
    const tower = new Tower(Owner.BOT, PRINCESS_TOWER, { x: 100, y: logicY })
    const grid = new Grid()
    const lancer = new Troop(
      Owner.PLAYER,
      CARD_DEFINITIONS.lancer!.stats!,
      { x: 100, y: logicY + 180 },
      grid,
      'lancer',
    )
    const approach = meleeApproachPoint(lancer.position, lancer, tower, 1.6)
    lancer.position.x = approach.x
    lancer.position.y = approach.y

    expect(edgeDistBetweenEntities(lancer, tower)).toBeCloseTo(1.6 * CELL_SIZE - CELL_SIZE * 0.5, 0)
  })

  it('bot tower melee approach uses attack range standoff for melee troops', () => {
    const logicY = BOT_TOWER_ROW * CELL_SIZE + CELL_SIZE / 2
    const tower = new Tower(Owner.BOT, PRINCESS_TOWER, { x: 100, y: logicY })
    const grid = new Grid()
    const lancer = new Troop(
      Owner.PLAYER,
      CARD_DEFINITIONS.lancer!.stats!,
      { x: 100, y: logicY + 300 },
      grid,
      'lancer',
    )
    const approach = meleeApproachPoint(lancer.position, lancer, tower, 1.6)

    expect(approach.y).toBeLessThan(lancer.position.y)
    lancer.position.x = approach.x
    lancer.position.y = approach.y
    expect(edgeDistBetweenEntities(lancer, tower)).toBeCloseTo(1.6 * CELL_SIZE - CELL_SIZE * 0.5, 0)
  })

  it('tower combat circles are centred on logic anchors for both sides', () => {
    const botLogicY = BOT_TOWER_ROW * CELL_SIZE + CELL_SIZE / 2
    const playerLogicY = 35 * CELL_SIZE + CELL_SIZE / 2
    const bot = new Tower(Owner.BOT, PRINCESS_TOWER, { x: 100, y: botLogicY })
    const player = new Tower(Owner.PLAYER, PRINCESS_TOWER, { x: 100, y: playerLogicY })

    expect(entityCollisionCenter(bot).y).toBe(botLogicY)
    expect(entityCollisionCenter(player).y).toBe(playerLogicY)
    expect(entityHalfExtents(bot).halfW).toBe(entityHalfExtents(player).halfW)
  })

  it('melee surface distance to princess tower uses circular combat hull', () => {
    const logicY = BOT_TOWER_ROW * CELL_SIZE + CELL_SIZE / 2
    const tower = new Tower(Owner.BOT, PRINCESS_TOWER, { x: 100, y: logicY })
    const half = entityHalfExtents(tower)
    const center = entityCollisionCenter(tower)
    const outside = { x: 100, y: center.y + half.halfH + 25 }

    expect(surfaceDistToEntity(outside, tower)).toBeCloseTo(25, 0)
    expect(surfaceDistToEntity({ x: center.x + half.halfW + 10, y: center.y }, tower)).toBeCloseTo(10, 0)
  })
})
