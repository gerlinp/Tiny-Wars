import { describe, it, expect } from 'vitest'
import { Owner } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import { GameSimulator } from '@core/GameSimulator'
import { Grid } from '@core/Grid'
import { PLAYER_DEPLOY_ROW_MAX, LEFT_LANE_COL } from '@data/GameConstants'

describe('Pigs (Royal Hogs)', () => {
  const stats = CARD_DEFINITIONS.pig!.stats!

  it('deploys four building-only hogs', () => {
    expect(CARD_DEFINITIONS.pig!.elixirCost).toBe(5)
    expect(CARD_DEFINITIONS.pig!.deployCount).toBe(4)
    expect(stats.targetsBuildingsOnly).toBe(true)

    const sim = new GameSimulator(new Grid())
    const cell = { x: LEFT_LANE_COL, y: PLAYER_DEPLOY_ROW_MAX }
    expect(sim.deployCard(Owner.PLAYER, CARD_DEFINITIONS.pig!, cell)).toBe(true)

    const deployed = [...sim.state.entities.values()].filter(e => e.cardId === 'pig')
    expect(deployed).toHaveLength(4)
    expect(deployed.every(p => p.owner === Owner.PLAYER)).toBe(true)
  })
})
