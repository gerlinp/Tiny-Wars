import { describe, it, expect } from 'vitest'
import { Tower } from '@core/entities/Tower'
import { Troop } from '@core/entities/Troop'
import { Grid } from '@core/Grid'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { PRINCESS_TOWER, KING_TOWER } from '@data/TowerData'

const troopStats: EntityStats = {
  maxHp: 500,
  speed: 1.5,
  damage: 50,
  attackRate: 1,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

describe('Tower targeting', () => {
  const grid = new Grid()
  const towerPos = { x: 100, y: 100 }

  it('locks onto the closest enemy and only damages that unit per shot', () => {
    const tower = new Tower(Owner.PLAYER, PRINCESS_TOWER, towerPos)
    const near = new Troop(Owner.BOT, troopStats, { x: 140, y: 100 }, grid, 'warrior')
    const far = new Troop(Owner.BOT, troopStats, { x: 220, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.towers.set(tower.id, tower)
    state.entities.set(near.id, near)
    state.entities.set(far.id, far)

    tower.tick(800, state)

    expect(tower.getTarget()?.id).toBe(near.id)
    expect(near.hp).toBeLessThan(troopStats.maxHp)
    expect(far.hp).toBe(troopStats.maxHp)
  })

  it('switches to the next closest when the current target dies', () => {
    const tower = new Tower(Owner.PLAYER, PRINCESS_TOWER, towerPos)
    const near = new Troop(Owner.BOT, troopStats, { x: 140, y: 100 }, grid, 'warrior')
    const far = new Troop(Owner.BOT, troopStats, { x: 220, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.towers.set(tower.id, tower)
    state.entities.set(near.id, near)
    state.entities.set(far.id, far)

    near.hp = 0
    tower.tick(0, state)
    tower.tick(800, state)

    expect(tower.getTarget()?.id).toBe(far.id)
    expect(far.hp).toBeLessThan(troopStats.maxHp)
  })

  it('fully kills the closest target before engaging the next closest', () => {
    const fragile: EntityStats = { ...troopStats, maxHp: 100 }
    const tower = new Tower(Owner.PLAYER, PRINCESS_TOWER, towerPos)
    const near = new Troop(Owner.BOT, fragile, { x: 140, y: 100 }, grid, 'warrior')
    const far = new Troop(Owner.BOT, troopStats, { x: 220, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.towers.set(tower.id, tower)
    state.entities.set(near.id, near)
    state.entities.set(far.id, far)

    tower.tick(0, state)
    expect(tower.getTarget()?.id).toBe(near.id)

    while (near.isAlive) {
      tower.tick(800, state)
      expect(tower.getTarget()?.id).toBe(near.id)
      expect(far.hp).toBe(troopStats.maxHp)
    }

    tower.tick(800, state) // cooldown after kill
    tower.tick(800, state) // first shot on next closest
    expect(tower.getTarget()?.id).toBe(far.id)
    expect(far.hp).toBeLessThan(troopStats.maxHp)
  })

  it('keeps attacking the current target when a closer enemy enters range', () => {
    const tower = new Tower(Owner.PLAYER, PRINCESS_TOWER, towerPos)
    const far = new Troop(Owner.BOT, troopStats, { x: 220, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.towers.set(tower.id, tower)
    state.entities.set(far.id, far)

    tower.tick(0, state)
    expect(tower.getTarget()?.id).toBe(far.id)

    const near = new Troop(Owner.BOT, troopStats, { x: 130, y: 100 }, grid, 'warrior')
    state.entities.set(near.id, near)
    tower.tick(800, state)

    expect(tower.getTarget()?.id).toBe(far.id)
    expect(far.hp).toBeLessThan(troopStats.maxHp)
    expect(near.hp).toBe(troopStats.maxHp)
  })
})

describe('King tower activation', () => {
  const grid = new Grid()
  const towerPos = { x: 100, y: 100 }

  it('starts dormant and does not attack', () => {
    const king = new Tower(Owner.PLAYER, KING_TOWER, towerPos)
    const enemy = new Troop(Owner.BOT, troopStats, { x: 140, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.towers.set(king.id, king)
    state.entities.set(enemy.id, enemy)

    expect(king.isActive()).toBe(false)
    king.tick(800, state)
    expect(king.getTarget()).toBeNull()
    expect(enemy.hp).toBe(troopStats.maxHp)
  })

  it('activates and attacks after taking damage', () => {
    const king = new Tower(Owner.PLAYER, KING_TOWER, towerPos)
    const enemy = new Troop(Owner.BOT, troopStats, { x: 140, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.towers.set(king.id, king)
    state.entities.set(enemy.id, enemy)

    king.takeDamage(1)
    expect(king.isActive()).toBe(true)

    king.tick(1000, state)  // burn the activation warm-up
    king.tick(800, state)
    expect(king.getTarget()?.id).toBe(enemy.id)
    expect(enemy.hp).toBeLessThan(troopStats.maxHp)
  })

  it('activates when activate() is called after a princess tower falls', () => {
    const king = new Tower(Owner.PLAYER, KING_TOWER, towerPos)
    expect(king.isActive()).toBe(false)
    king.activate()
    expect(king.isActive()).toBe(true)
  })

  it('does not acquire targets while dormant even with enemies in range', () => {
    const king = new Tower(Owner.PLAYER, KING_TOWER, towerPos)
    const enemy = new Troop(Owner.BOT, troopStats, { x: 140, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.towers.set(king.id, king)
    state.entities.set(enemy.id, enemy)

    king.tick(800, state)
    expect(king.getTarget()).toBeNull()
    expect(king.getAimPoint()).toBeNull()
    expect(enemy.hp).toBe(troopStats.maxHp)
  })
})
