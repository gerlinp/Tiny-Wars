import type { GameState } from './GameState'
import { ELIXIR_MAX, ELIXIR_REGEN_MS, ELIXIR_FAST_MS, ELIXIR_FAST_AT, GAME_DURATION_MS } from '@data/GameConstants'
import { Owner } from './types'

export function tickElixir(state: GameState, deltaMs: number): void {
  const timeRemaining = GAME_DURATION_MS - state.elapsedMs
  const regenMs = timeRemaining <= ELIXIR_FAST_AT ? ELIXIR_FAST_MS : ELIXIR_REGEN_MS
  const gain = deltaMs / regenMs

  tickOwnerElixir(state, Owner.PLAYER, gain)
  tickOwnerElixir(state, Owner.BOT, gain)
}

function tickOwnerElixir(state: GameState, owner: Owner, gain: number): void {
  if (owner === Owner.PLAYER) {
    if (state.playerElixir >= ELIXIR_MAX) return
    state.playerElixirAccum += gain
    if (state.playerElixirAccum >= 1) {
      const delta = Math.floor(state.playerElixirAccum)
      state.playerElixirAccum -= delta
      state.playerElixir = Math.min(ELIXIR_MAX, state.playerElixir + delta)
    }
  } else {
    if (state.botElixir >= ELIXIR_MAX) return
    state.botElixirAccum += gain
    if (state.botElixirAccum >= 1) {
      const delta = Math.floor(state.botElixirAccum)
      state.botElixirAccum -= delta
      state.botElixir = Math.min(ELIXIR_MAX, state.botElixir + delta)
    }
  }
}
