import { describe, it, expect } from 'vitest'
import { refreshStickyTarget, isAttackableTower } from '@core/TargetSelection'
import { Troop } from '@core/entities/Troop'
import { Tower } from '@core/entities/Tower'
import { Building } from '@core/entities/Building'
import { Grid } from '@core/Grid'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { BOMB_TOWER_LIFETIME_MS, BOT_KING_COL, BOT_KING_ROW } from '@data/GameConstants'
import { KING_TOWER } from '@data/TowerData'

const troopStats: EntityStats = {
  maxHp: 500,
  speed: 1.5,
  damage: 50,
  attackRate: 1,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

const BOMB_TOWER_STATS: EntityStats = {
  maxHp: 1356,
  speed: 0,
  damage: 222,
  attackRate: 1 / 1.8,
  attackRange: 6.0,
  unitType: UnitType.GROUND,
  attackType: AttackType.AIR_AND_GROUND,
  splashRadius: 1.5,
  deathSplashRadius: 3,
  lifetimeMs: BOMB_TOWER_LIFETIME_MS,
}

describe('refreshStickyTarget', () => {
  const grid = new Grid()
  const from = { x: 100, y: 100 }

  it('returns the current target while it is alive', () => {
    const far = new Troop(Owner.BOT, troopStats, { x: 220, y: 100 }, grid, 'warrior')
    const near = new Troop(Owner.BOT, troopStats, { x: 130, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(far.id, far)
    state.entities.set(near.id, near)

    const picked = refreshStickyTarget(far, state, {
      owner: Owner.PLAYER,
      from,
      distance: (a, b) => Math.hypot(a.x - b.position.x, a.y - b.position.y),
    })

    expect(picked?.id).toBe(far.id)
  })

  it('picks the closest enemy when there is no current target', () => {
    const far = new Troop(Owner.BOT, troopStats, { x: 220, y: 100 }, grid, 'warrior')
    const near = new Troop(Owner.BOT, troopStats, { x: 130, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(far.id, far)
    state.entities.set(near.id, near)

    const picked = refreshStickyTarget(null, state, {
      owner: Owner.PLAYER,
      from,
      distance: (a, b) => Math.hypot(a.x - b.position.x, a.y - b.position.y),
    })

    expect(picked?.id).toBe(near.id)
  })

  it('picks the closest enemy when the current target is dead', () => {
    const dead = new Troop(Owner.BOT, troopStats, { x: 120, y: 100 }, grid, 'warrior')
    dead.hp = 0
    const next = new Troop(Owner.BOT, troopStats, { x: 200, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(dead.id, dead)
    state.entities.set(next.id, next)

    const picked = refreshStickyTarget(dead, state, {
      owner: Owner.PLAYER,
      from,
      distance: (a, b) => Math.hypot(a.x - b.position.x, a.y - b.position.y),
    })

    expect(picked?.id).toBe(next.id)
  })

  it('skips dormant king towers when includeTowers is set', () => {
    const king = new Tower(
      Owner.BOT,
      KING_TOWER,
      { x: BOT_KING_COL * CELL_SIZE, y: BOT_KING_ROW * CELL_SIZE },
    )
    const troop = new Troop(Owner.BOT, troopStats, { x: 130, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.towers.set(king.id, king)
    state.entities.set(troop.id, troop)

    expect(isAttackableTower(king)).toBe(false)

    const picked = refreshStickyTarget(null, state, {
      owner: Owner.PLAYER,
      from,
      includeTowers: true,
      distance: (a, b) => Math.hypot(a.x - b.position.x, a.y - b.position.y),
    })

    expect(picked?.id).toBe(troop.id)
  })
})

describe('dormant king targeting', () => {
  const grid = new Grid()

  it('buildings with tower attacks ignore a dormant king', () => {
    const king = new Tower(
      Owner.BOT,
      KING_TOWER,
      { x: BOT_KING_COL * CELL_SIZE, y: BOT_KING_ROW * CELL_SIZE },
    )
    const building = new Building(
      Owner.PLAYER,
      BOMB_TOWER_STATS,
      { x: king.position.x, y: king.position.y + 80 },
      'wood_tower',
    )
    const state = createInitialGameState()
    state.towers.set(king.id, king)
    state.entities.set(building.id, building)

    for (let i = 0; i < 40; i++) building.tick(50, state)

    expect(king.hp).toBe(KING_TOWER.maxHp)
  })
})
