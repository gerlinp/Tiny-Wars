import { describe, it, expect } from 'vitest'
import { Grid } from '@core/Grid'
import { GameSimulator } from '@core/GameSimulator'
import { Owner, CardType } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import { LEFT_BRIDGE_COLS, RIGHT_BRIDGE_COLS, RIVER_ROW_START, BOMB_TOWER_CARD_ID } from '@data/GameConstants'

function cheapTroopCard() {
  const card = Object.values(CARD_DEFINITIONS).find(
    c => c.cardType === CardType.TROOP && c.elixirCost <= 5 && c.id !== 'miner',
  )
  expect(card).toBeDefined()
  return card!
}

describe('bridge deploy after tower falls', () => {
  it('unlocks the downed lane bridge for troops only, other bridge stays locked', () => {
    const sim = new GameSimulator(new Grid())
    const troop = cheapTroopCard()
    const leftBridge = { x: LEFT_BRIDGE_COLS[0]!, y: RIVER_ROW_START }
    const rightBridge = { x: RIGHT_BRIDGE_COLS[0]!, y: RIVER_ROW_START }

    // Locked while both towers stand.
    expect(sim.canDeployAt(Owner.PLAYER, troop, leftBridge)).toBe(false)
    expect(sim.canDeployAt(Owner.PLAYER, troop, rightBridge)).toBe(false)

    // Left enemy tower falls → left lane unlocks for the player.
    sim.state.enemyLaneDeploy[Owner.PLAYER].left = true

    expect(sim.canDeployAt(Owner.PLAYER, troop, leftBridge)).toBe(true)
    expect(sim.canDeployAt(Owner.PLAYER, troop, rightBridge)).toBe(false)

    // Buildings still can't sit on the bridge.
    const building = CARD_DEFINITIONS[BOMB_TOWER_CARD_ID]!
    sim.state.playerElixir = 10
    expect(sim.canDeployAt(Owner.PLAYER, building, leftBridge)).toBe(false)
  })
})
