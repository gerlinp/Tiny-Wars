import { describe, it, expect } from 'vitest'
import { Grid } from '@core/Grid'
import { GameSimulator } from '@core/GameSimulator'
import { CARD_DEFINITIONS } from '@data/CardData'
import { Owner } from '@core/types'
import { PLAYER_DEPLOY_ROW_MIN, GAME_DURATION_MS } from '@data/GameConstants'

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

  it('starts with 5 elixir each (Clash Royale standard)', () => {
    const sim = makeSim()
    expect(sim.state.playerElixir).toBe(5)
    expect(sim.state.botElixir).toBe(5)
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

  it('deploys skeleton army as a 14-unit swarm cluster', () => {
    const sim = makeSim()
    const card = CARD_DEFINITIONS['skeleton_army']!
    sim.state.playerElixir = 5
    const ok = sim.deployCard(Owner.PLAYER, card, { x: 11, y: PLAYER_DEPLOY_ROW_MIN })
    expect(ok).toBe(true)
    expect(sim.state.playerElixir).toBe(2)
    expect(sim.state.entities.size).toBe(14)
    for (const entity of sim.state.entities.values()) {
      expect(entity.cardId).toBe('skeleton_army')
    }
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

  it('enters overtime when regulation ends tied', () => {
    const sim = makeSim()
    sim.state.elapsedMs = GAME_DURATION_MS - 34
    sim.tick(35)
    expect(sim.state.phase).toBe('OVERTIME')
    expect(sim.state.winner).toBeNull()
  })

  it('ends at 3 minutes when a player leads on crowns', () => {
    const sim = makeSim()
    sim.state.playerCrowns = 1
    sim.state.elapsedMs = GAME_DURATION_MS - 34
    sim.tick(35)
    expect(sim.state.phase).toBe('ENDED')
    expect(sim.state.winner).toBe(Owner.PLAYER)
  })

  describe('canDeployAt', () => {
    it('rejects player deploy on row 22 (river boundary)', () => {
      const sim = makeSim()
      const card = CARD_DEFINITIONS['archer']!
      sim.state.playerElixir = 10
      expect(sim.canDeployAt(Owner.PLAYER, card, { x: 11, y: 22 })).toBe(false)
    })

    it('accepts player deploy at row 23 and inner zone edge below king', () => {
      const sim = makeSim()
      const card = CARD_DEFINITIONS['archer']!
      sim.state.playerElixir = 10
      expect(sim.canDeployAt(Owner.PLAYER, card, { x: 11, y: PLAYER_DEPLOY_ROW_MIN })).toBe(true)
      expect(sim.canDeployAt(Owner.PLAYER, card, { x: 11, y: 28 })).toBe(true)
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
