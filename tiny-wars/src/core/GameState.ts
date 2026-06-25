import type { GameEvent, Owner } from './types'
import type { Entity } from './entities/Entity'
import type { Tower } from './entities/Tower'
import type { LaneUnlocks } from './DeployZones'
import { createEmptyEnemyLaneDeploy } from './DeployZones'

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
  /** Per-owner lanes unlocked on the opponent's half after a princess tower falls. */
  enemyLaneDeploy: Record<Owner, LaneUnlocks>
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
    enemyLaneDeploy: createEmptyEnemyLaneDeploy(),
    entities: new Map(),
    towers: new Map(),
    events: [],
    phase: 'BATTLE',
    winner: null,
  }
}
