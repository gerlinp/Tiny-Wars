import { describe, it, expect } from 'vitest'
import { getElixirRegenMs } from '@core/ElixirSystem'
import { createInitialGameState } from '@core/GameState'
import {
  ELIXIR_REGEN_MS,
  ELIXIR_FAST_MS,
  ELIXIR_TRIPLE_MS,
  ELIXIR_FAST_AT,
  GAME_DURATION_MS,
} from '@data/GameConstants'

describe('Elixir regen rates', () => {
  it('uses normal regen during early regulation', () => {
    const state = createInitialGameState()
    state.elapsedMs = 30_000
    expect(getElixirRegenMs(state)).toBe(ELIXIR_REGEN_MS)
  })

  it('uses double regen in the last 60 seconds of regulation', () => {
    const state = createInitialGameState()
    state.elapsedMs = GAME_DURATION_MS - ELIXIR_FAST_AT + 1
    expect(getElixirRegenMs(state)).toBe(ELIXIR_FAST_MS)
  })

  it('uses triple regen during overtime', () => {
    const state = createInitialGameState()
    state.phase = 'OVERTIME'
    state.elapsedMs = GAME_DURATION_MS + 10_000
    expect(getElixirRegenMs(state)).toBe(ELIXIR_TRIPLE_MS)
  })

  it('uses triple regen during tie break', () => {
    const state = createInitialGameState()
    state.phase = 'TIE_BREAK'
    expect(getElixirRegenMs(state)).toBe(ELIXIR_TRIPLE_MS)
  })
})
