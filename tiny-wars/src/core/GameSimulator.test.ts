import { describe, it, expect } from 'vitest'
import { Grid } from './Grid'
import { GameSimulator } from './GameSimulator'
import { CARD_DEFINITIONS } from '@data/CardData'
import { Owner } from './types'
import { PLAYER_DEPLOY_ROW_MIN } from '@data/GameConstants'

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
    const card = CARD_DEFINITIONS['warrior']! // costs 5 elixir
    // Force elixir below cost
    sim.state.playerElixir = 2
    const ok = sim.deployCard(Owner.PLAYER, card, { x: 11, y: PLAYER_DEPLOY_ROW_MIN })
    expect(ok).toBe(false)
    expect(sim.state.entities.size).toBe(0)
  })

  it('accepts valid card deployment and deducts elixir', () => {
    const sim = makeSim()
    const card = CARD_DEFINITIONS['archer']! // costs 3 elixir
    sim.state.playerElixir = 5
    const ok = sim.deployCard(Owner.PLAYER, card, { x: 11, y: PLAYER_DEPLOY_ROW_MIN })
    expect(ok).toBe(true)
    expect(sim.state.playerElixir).toBe(2)
    expect(sim.state.entities.size).toBe(1)
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
})
