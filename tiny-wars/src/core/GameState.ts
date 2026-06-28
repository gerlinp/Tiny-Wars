import type { GameEvent, Owner } from './types'
import type { Entity } from './entities/Entity'
import type { Tower } from './entities/Tower'
import type { LaneUnlocks } from './DeploySystem'
import type { FlowFieldManager } from './FlowFieldManager'
import type { ActiveBoomerang } from './BoomerangSystem'
import { createEmptyEnemyLaneDeploy } from './DeploySystem'
import { ELIXIR_START } from '@data/GameConstants'

export type GamePhase = 'BATTLE' | 'OVERTIME' | 'TIE_BREAK' | 'ENDED'

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
  /** Flow fields for tower-march navigation. Undefined in tests/environments without GameSimulator. */
  flowFields?: FlowFieldManager
  /** Active boomerang projectiles (Executioner / Gnoll). */
  boomerangs?: ActiveBoomerang[]
}

export function createInitialGameState(): GameState {
  return {
    tick: 0,
    elapsedMs: 0,
    playerElixir: ELIXIR_START,
    botElixir: ELIXIR_START,
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
