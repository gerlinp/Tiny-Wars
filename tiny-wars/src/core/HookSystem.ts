import type { GameState } from './GameState'
import type { Entity } from './entities/Entity'
import type { Troop } from './entities/Troop'
import { EntityKind, UnitType } from './types'
import type { Vec2 } from './types'
import { CELL_SIZE } from '@data/GameConstants'
import { dist } from './Vector2'
import { edgeDistBetweenEntities } from './EntityGeometry'
import { moveTowardDirect, reachedWorldPoint } from './Movement'

/** Fisherman L14 hook projectile speed (~800 CR units vs medium 60). */
export const HOOK_FLY_SPEED_PX_PER_SEC = 20 * CELL_SIZE
export const HOOK_PULL_SPEED_PX_PER_SEC = 5 * CELL_SIZE
export const HOOK_HIT_RADIUS_PX = CELL_SIZE * 0.45

export interface ActiveHook {
  id: string
  throwerId: string
  targetId: string
  owner: import('./types').Owner
  hookTip: Vec2
  phase: 'flying' | 'pull_troop' | 'pull_self'
  slowDurationMs: number
  slowSpeedMultiplier: number
  meleeRangePx: number
}

let nextHookId = 0

export function isHookThrowerBusy(state: GameState, throwerId: string): boolean {
  return state.hooks?.some(h => h.throwerId === throwerId) ?? false
}

export function canHookTarget(target: Entity): boolean {
  if (!target.isAlive) return false
  if (target.kind === EntityKind.TROOP) {
    return (target as Troop).stats.unitType === UnitType.GROUND
  }
  return target.kind === EntityKind.BUILDING || target.kind === EntityKind.TOWER
}

export function launchHook(
  state: GameState,
  thrower: Troop,
  target: Entity,
  slowDurationMs: number,
  slowSpeedMultiplier: number,
): void {
  if (!state.hooks) state.hooks = []

  const pullTroop = target.kind === EntityKind.TROOP
  state.hooks.push({
    id: `hook_${nextHookId++}`,
    throwerId: thrower.id,
    targetId: target.id,
    owner: thrower.owner,
    hookTip: { ...thrower.position },
    phase: 'flying',
    slowDurationMs,
    slowSpeedMultiplier,
    meleeRangePx: thrower.stats.attackRange * CELL_SIZE,
  })

  state.events.push({
    type: 'HOOK',
    hookId: state.hooks[state.hooks.length - 1]!.id,
    throwerId: thrower.id,
    targetId: target.id,
    pullTroop,
  })
}

function resolveEntity(state: GameState, id: string): Entity | null {
  return state.entities.get(id) ?? state.towers.get(id) ?? null
}

function stepFlying(hook: ActiveHook, deltaMs: number, state: GameState): boolean {
  const thrower = state.entities.get(hook.throwerId) as Troop | undefined
  const target = resolveEntity(state, hook.targetId)
  if (!thrower?.isAlive || !target?.isAlive) return false

  const aim = target.position
  const stepPx = (HOOK_FLY_SPEED_PX_PER_SEC * deltaMs) / 1000
  moveTowardDirect(hook.hookTip, aim, stepPx)

  if (dist(hook.hookTip, aim) <= HOOK_HIT_RADIUS_PX + stepPx) {
    hook.hookTip = { ...aim }
    if (target.kind === EntityKind.TROOP) {
      hook.phase = 'pull_troop'
      ;(target as Troop).applySlow(hook.slowDurationMs, hook.slowSpeedMultiplier)
    } else {
      hook.phase = 'pull_self'
    }
  }
  return true
}

function stepPullTroop(hook: ActiveHook, deltaMs: number, state: GameState): boolean {
  const thrower = state.entities.get(hook.throwerId) as Troop | undefined
  const target = state.entities.get(hook.targetId) as Troop | undefined
  if (!thrower?.isAlive || !target?.isAlive) return false

  const stepPx = (HOOK_PULL_SPEED_PX_PER_SEC * deltaMs) / 1000
  moveTowardDirect(target.position, thrower.position, stepPx)

  if (
    edgeDistBetweenEntities(target, thrower) <= hook.meleeRangePx
    || reachedWorldPoint(target.position, thrower.position, stepPx)
  ) {
    return false
  }
  return true
}

function stepPullSelf(hook: ActiveHook, deltaMs: number, state: GameState): boolean {
  const thrower = state.entities.get(hook.throwerId) as Troop | undefined
  const target = resolveEntity(state, hook.targetId)
  if (!thrower?.isAlive || !target?.isAlive) return false

  const goal = target.position
  const stepPx = (HOOK_PULL_SPEED_PX_PER_SEC * deltaMs) / 1000
  moveTowardDirect(thrower.position, goal, stepPx)

  if (
    edgeDistBetweenEntities(thrower, target) <= hook.meleeRangePx
    || reachedWorldPoint(thrower.position, goal, stepPx)
  ) {
    return false
  }
  return true
}

export function tickHooks(state: GameState, deltaMs: number): void {
  if (!state.hooks?.length) return

  state.hooks = state.hooks.filter(hook => {
    switch (hook.phase) {
      case 'flying':
        return stepFlying(hook, deltaMs, state)
      case 'pull_troop':
        return stepPullTroop(hook, deltaMs, state)
      case 'pull_self':
        return stepPullSelf(hook, deltaMs, state)
      default:
        return false
    }
  })
}

/** Thrower position for rope anchor — falls back to hook tip if thrower is gone. */
export function hookAnchorPosition(state: GameState, hook: ActiveHook): Vec2 {
  const thrower = state.entities.get(hook.throwerId)
  return thrower?.isAlive ? thrower.position : hook.hookTip
}

/** Rope end — hook tip while flying; latched target position while pulling. */
export function hookRopeEndPosition(state: GameState, hook: ActiveHook): Vec2 {
  if (hook.phase === 'flying') return hook.hookTip
  const target = resolveEntity(state, hook.targetId)
  return target?.isAlive ? target.position : hook.hookTip
}

/** @deprecated Use {@link hookRopeEndPosition} — kept for callers that only need the tip. */
export function hookVisualTargets(state: GameState, hook: ActiveHook): { from: Vec2; to: Vec2 } {
  const from = hookAnchorPosition(state, hook)
  return { from, to: hookRopeEndPosition(state, hook) }
}
