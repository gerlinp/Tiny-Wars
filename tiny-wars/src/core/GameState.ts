import type { GameEvent, Owner } from './types'
import type { Entity } from './entities/Entity'
import type { Tower } from './entities/Tower'

export type GamePhase = 'BATTLE' | 'OVERTIME' | 'ENDED'

export interface GameState {
  tick: number
  elapsedMs: number
  playerElixir: number
  botElixir: number
  playerElixirAccum: number  // accumulated fractional elixir
  botElixirAccum: number
  playerCrowns: number
  botCrowns: number
  entities: Map<string, Entity>
  towers: Map<string, Tower>
  events: GameEvent[]
  phase: GamePhase
  winner: Owner | null
}

export function createInitialGameState(): GameState {
  return {
    tick: 0,
    elapsedMs: 0,
    playerElixir: 4,
    botElixir: 4,
    playerElixirAccum: 0,
    botElixirAccum: 0,
    playerCrowns: 0,
    botCrowns: 0,
    entities: new Map(),
    towers: new Map(),
    events: [],
    phase: 'BATTLE',
    winner: null,
  }
}
