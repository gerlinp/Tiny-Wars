import { describe, it, expect } from 'vitest'
import { GameSimulator } from '@core/GameSimulator'
import { Grid } from '@core/Grid'
import { Owner } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import { CR_SPEED, crSpeedToCellsPerSec } from '@data/GameConstants'

describe('Paddle Sharks (Barbarians)', () => {
  const stats = CARD_DEFINITIONS.paddle_shark!.stats!

  it('deploys five melee raiders with CR L14 barbarian stats', () => {
    expect(CARD_DEFINITIONS.paddle_shark!.elixirCost).toBe(5)
    expect(CARD_DEFINITIONS.paddle_shark!.deployCount).toBe(5)
    expect(stats.maxHp).toBe(915)
    expect(stats.damage).toBe(254)
    expect(stats.attackRate).toBeCloseTo(1 / 1.4, 5)
    expect(stats.attackRange).toBe(0.7)
    expect(stats.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.medium))
  })

  it('spawns five troops on deploy', () => {
    const sim = new GameSimulator(new Grid())
    const cell = { x: 10, y: 30 }
    expect(sim.deployCard(Owner.PLAYER, CARD_DEFINITIONS.paddle_shark!, cell)).toBe(true)

    const deployed = [...sim.state.entities.values()].filter(e => e.cardId === 'paddle_shark')
    expect(deployed).toHaveLength(5)
    expect(deployed.every(d => d.owner === Owner.PLAYER)).toBe(true)
  })
})
