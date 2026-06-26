import { describe, it, expect } from 'vitest'
import { Grid } from './Grid'
import { GameSimulator } from './GameSimulator'
import { CARD_DEFINITIONS } from '@data/CardData'
import { Owner } from './types'
import { PLAYER_DEPLOY_ROW_MIN, PLAYER_DEPLOY_ROW_MAX, BOT_KING_COL, BOT_KING_ROW, CELL_SIZE } from '@data/GameConstants'
import { Troop } from './entities/Troop'
import { resolveTroopCollisions } from './TroopCollision'
import { edgeDistBetweenEntities } from './EntityGeometry'

function makeSim() {
  return new GameSimulator(new Grid())
}

describe('GameSimulator', () => {
  it('initialises with 3 player towers and 3 bot towers', () => {
    const sim = makeSim()
    const playerTowers = [...sim.state.towers.values()].filter(t => t.owner === Owner.PLAYER)
    const botTowers    = [...sim.state.towers.values()].filter(t => t.owner === Owner.BOT)
    expect(playerTowers).toHaveLength(3)
    expect(botTowers).toHaveLength(3)
  })

  it('blocks tower footprint cells on the pathfinding grid', () => {
    const grid = new Grid()
    const sim = new GameSimulator(grid)
    for (const tower of sim.state.towers.values()) {
      for (const cell of tower.blockedCells) {
        expect(grid.isWalkable(cell.x, cell.y)).toBe(false)
      }
    }
  })

  it('lets a lancer path around the king footprint to melee range', () => {
    const grid = new Grid()
    const sim = new GameSimulator(grid)
    const state = sim.state
    const lancerStats = CARD_DEFINITIONS.lancer!.stats!

    let botKing = null as import('./entities/Tower').Tower | null
    for (const [id, tower] of state.towers) {
      if (tower.owner === Owner.BOT && tower.isKing) {
        tower.activate()
        botKing = tower
      } else if (tower.owner === Owner.BOT) {
        for (const cell of tower.blockedCells) grid.unblockCell(cell.x, cell.y)
        state.towers.delete(id)
      }
    }

    const lancer = new Troop(
      Owner.PLAYER,
      lancerStats,
      { x: (BOT_KING_COL + 3) * CELL_SIZE, y: 14 * CELL_SIZE },
      grid,
      'lancer',
    )
    state.entities.set(lancer.id, lancer)

    for (let i = 0; i < 500; i++) {
      lancer.tick(50, state)
      for (const tower of state.towers.values()) tower.tick(50, state)
      resolveTroopCollisions(state, 50)
    }

    expect(botKing).not.toBeNull()
    expect(edgeDistBetweenEntities(lancer, botKing!)).toBeLessThanOrEqual(
      lancerStats.attackRange * CELL_SIZE + 1,
    )
  })

  it('starts with 4 elixir each', () => {
    const sim = makeSim()
    expect(sim.state.playerElixir).toBe(4)
    expect(sim.state.botElixir).toBe(4)
  })

  it('ticking increases elapsed time', () => {
    const sim = makeSim()
    sim.tick(33)
    expect(sim.state.elapsedMs).toBe(33)
    expect(sim.state.tick).toBe(1)
  })

  it('rejects card deploy when player has insufficient elixir', () => {
    const sim = makeSim()
    const card = CARD_DEFINITIONS['warrior']! // costs 3 elixir
    // Force elixir below cost
    sim.state.playerElixir = 2
    const ok = sim.deployCard(Owner.PLAYER, card, { x: 11, y: PLAYER_DEPLOY_ROW_MIN })
    expect(ok).toBe(false)
    expect(sim.state.entities.size).toBe(0)
  })

  it('accepts valid card deployment and deducts elixir', () => {
    const sim = makeSim()
    const card = CARD_DEFINITIONS['archer']! // costs 3 elixir, spawns 2
    sim.state.playerElixir = 5
    const ok = sim.deployCard(Owner.PLAYER, card, { x: 11, y: PLAYER_DEPLOY_ROW_MIN })
    expect(ok).toBe(true)
    expect(sim.state.playerElixir).toBe(2)
    expect(sim.state.entities.size).toBe(2)
  })

  it('runs 30 ticks without crashing', () => {
    const sim = makeSim()
    const card = CARD_DEFINITIONS['pawn']!
    sim.state.playerElixir = 10
    sim.deployCard(Owner.PLAYER, card, { x: 11, y: PLAYER_DEPLOY_ROW_MIN })

    for (let i = 0; i < 30; i++) {
      sim.tick(33)
    }

    expect(sim.state.tick).toBe(30)
    expect(sim.state.phase).toBe('BATTLE')
  })

  it('detects end-of-game at 3 minutes', () => {
    const sim = makeSim()
    // Skip ahead past 3 minutes
    sim.state.elapsedMs = 180_000 - 34
    sim.tick(35)
    expect(sim.state.phase).toBe('ENDED')
  })

  describe('canDeployAt', () => {
    it('rejects player deploy on row 22 (river boundary)', () => {
      const sim = makeSim()
      const card = CARD_DEFINITIONS['archer']!
      sim.state.playerElixir = 10
      expect(sim.canDeployAt(Owner.PLAYER, card, { x: 11, y: 22 })).toBe(false)
    })

    it('accepts player deploy at row 23 and row 42 (zone edges)', () => {
      const sim = makeSim()
      const card = CARD_DEFINITIONS['archer']!
      sim.state.playerElixir = 10
      expect(sim.canDeployAt(Owner.PLAYER, card, { x: 11, y: PLAYER_DEPLOY_ROW_MIN })).toBe(true)
      expect(sim.canDeployAt(Owner.PLAYER, card, { x: 11, y: PLAYER_DEPLOY_ROW_MAX })).toBe(true)
    })

    it('rejects deploy when player has insufficient elixir', () => {
      const sim = makeSim()
      const card = CARD_DEFINITIONS['warrior']!
      sim.state.playerElixir = 2
      expect(sim.canDeployAt(Owner.PLAYER, card, { x: 11, y: PLAYER_DEPLOY_ROW_MIN })).toBe(false)
    })

    it('rocket spell can target anywhere on the arena', () => {
      const sim = makeSim()
      const card = CARD_DEFINITIONS['tnt']!
      sim.state.playerElixir = 10
      expect(sim.canDeployAt(Owner.PLAYER, card, { x: 11, y: 5 })).toBe(true)
      expect(sim.deployCard(Owner.PLAYER, card, { x: 11, y: 5 })).toBe(true)
      expect(sim.state.playerElixir).toBe(4)
      expect(sim.state.events.some(e => e.type === 'SPELL_CAST')).toBe(true)
    })

    it('arrows spell costs 3 and hits in a 4-cell radius', () => {
      const sim = makeSim()
      const card = CARD_DEFINITIONS['arrows']!
      sim.state.playerElixir = 5
      expect(sim.deployCard(Owner.PLAYER, card, { x: 11, y: 10 })).toBe(true)
      expect(sim.state.playerElixir).toBe(2)
      const cast = sim.state.events.find(e => e.type === 'SPELL_CAST')
      expect(cast?.type === 'SPELL_CAST' && cast.cardId).toBe('arrows')
    })

    it('allows player deploy on enemy left lane after bot left tower falls', () => {
      const sim = makeSim()
      sim.state.enemyLaneDeploy[Owner.PLAYER].left = true
      sim.state.playerElixir = 10
      const card = CARD_DEFINITIONS['warrior']!
      expect(sim.canDeployAt(Owner.PLAYER, card, { x: 4, y: 5 })).toBe(true)
      expect(sim.canDeployAt(Owner.PLAYER, card, { x: 19, y: 5 })).toBe(false)
    })
  })
})
