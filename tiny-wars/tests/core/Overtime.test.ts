import { describe, it, expect } from 'vitest'
import { checkTimeWin } from '@core/CombatSystem'
import { createInitialGameState } from '@core/GameState'
import { Owner } from '@core/types'
import { GAME_DURATION_MS, OVERTIME_DURATION_MS } from '@data/GameConstants'

describe('Overtime', () => {
  it('enters overtime when regulation ends tied', () => {
    const state = createInitialGameState()
    checkTimeWin(state, GAME_DURATION_MS)
    expect(state.phase).toBe('OVERTIME')
    expect(state.winner).toBeNull()
  })

  it('ends immediately when regulation ends with a crown lead', () => {
    const state = createInitialGameState()
    state.playerCrowns = 1
    checkTimeWin(state, GAME_DURATION_MS)
    expect(state.phase).toBe('ENDED')
    expect(state.winner).toBe(Owner.PLAYER)
  })

  it('ends overtime on crown lead after 2 minutes', () => {
    const state = createInitialGameState()
    state.phase = 'OVERTIME'
    state.botCrowns = 2
    checkTimeWin(state, GAME_DURATION_MS + OVERTIME_DURATION_MS)
    expect(state.phase).toBe('ENDED')
    expect(state.winner).toBe(Owner.BOT)
  })

  it('enters tie break when overtime expires tied on crowns', () => {
    const state = createInitialGameState()
    state.phase = 'OVERTIME'
    checkTimeWin(state, GAME_DURATION_MS + OVERTIME_DURATION_MS)
    expect(state.phase).toBe('TIE_BREAK')
    expect(state.winner).toBeNull()
  })

  it('continues ticking during overtime before time expires', () => {
    const state = createInitialGameState()
    state.phase = 'OVERTIME'
    checkTimeWin(state, GAME_DURATION_MS + OVERTIME_DURATION_MS - 1)
    expect(state.phase).toBe('OVERTIME')
  })
})
