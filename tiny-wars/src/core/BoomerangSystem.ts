import type { GameState } from './GameState'
import type { Entity } from './entities/Entity'
import type { Troop } from './entities/Troop'
import { EntityKind, AttackType, Owner, UnitType } from './types'
import type { Vec2 } from './types'
import { CELL_SIZE } from '@data/GameConstants'
import { dist } from './Vector2'

export const BOOMERANG_OUT_SPEED_PX_PER_SEC = 130
export const BOOMERANG_RETURN_SPEED_PX_PER_SEC = 85

export interface ActiveBoomerang {
  id: string
  owner: Owner
  throwerId: string
  attackType: AttackType
  damage: number
  splashRadiusCells: number
  dir: Vec2
  position: Vec2
  origin: Vec2
  travelLimitPx: number
  phase: 'out' | 'return'
  hitThisPass: Set<string>
}

let nextBoomerangId = 0

export function isBoomerangThrowerBusy(state: GameState, throwerId: string): boolean {
  return state.boomerangs?.some(b => b.throwerId === throwerId) ?? false
}

function boomerangCanHit(attackType: AttackType, entity: Entity): boolean {
  if (attackType === AttackType.AIR_AND_GROUND) return true
  const unitType = (entity as Troop).stats?.unitType
  if (!unitType) return true
  if (attackType === AttackType.AIR_ONLY) return unitType === UnitType.AIR
  if (attackType === AttackType.GROUND_ONLY) return unitType === UnitType.GROUND
  return true
}

function damageAtPosition(boomerang: ActiveBoomerang, state: GameState): void {
  const radiusPx = boomerang.splashRadiusCells * CELL_SIZE

  const tryHit = (entity: Entity): void => {
    if (entity.owner === boomerang.owner || !entity.isAlive) return
    if (boomerang.hitThisPass.has(entity.id)) return
    if (!boomerangCanHit(boomerang.attackType, entity)) return
    if (dist(boomerang.position, entity.position) > radiusPx) return

    boomerang.hitThisPass.add(entity.id)
    entity.takeDamage(boomerang.damage)
    state.events.push({
      type: 'DAMAGE',
      targetId: entity.id,
      amount: boomerang.damage,
      attackerId: boomerang.throwerId,
      splash: true,
    })
  }

  for (const entity of state.entities.values()) {
    if (entity.kind === EntityKind.TROOP || entity.kind === EntityKind.BUILDING) {
      tryHit(entity)
    }
  }

  for (const tower of state.towers.values()) {
    tryHit(tower)
  }
}

function stepBoomerang(boomerang: ActiveBoomerang, deltaMs: number, state: GameState): boolean {
  const thrower = state.entities.get(boomerang.throwerId)
  if (!thrower?.isAlive) return false

  const speed = boomerang.phase === 'out'
    ? BOOMERANG_OUT_SPEED_PX_PER_SEC
    : BOOMERANG_RETURN_SPEED_PX_PER_SEC
  const stepPx = (speed * deltaMs) / 1000

  if (boomerang.phase === 'out') {
    boomerang.position.x += boomerang.dir.x * stepPx
    boomerang.position.y += boomerang.dir.y * stepPx
    damageAtPosition(boomerang, state)

    if (dist(boomerang.origin, boomerang.position) >= boomerang.travelLimitPx) {
      boomerang.phase = 'return'
      boomerang.hitThisPass.clear()
    }
    return true
  }

  const home = thrower.position
  const dx = home.x - boomerang.position.x
  const dy = home.y - boomerang.position.y
  const len = Math.hypot(dx, dy)
  if (len <= stepPx + 2) return false

  boomerang.dir = { x: dx / len, y: dy / len }
  boomerang.position.x += boomerang.dir.x * stepPx
  boomerang.position.y += boomerang.dir.y * stepPx
  damageAtPosition(boomerang, state)
  return true
}

export function launchBoomerang(
  state: GameState,
  thrower: Troop,
  target: Entity,
  travelCells: number,
  damage: number,
): void {
  const dx = target.position.x - thrower.position.x
  const dy = target.position.y - thrower.position.y
  const len = Math.hypot(dx, dy) || 1
  const dir = { x: dx / len, y: dy / len }
  const travelLimitPx = travelCells * CELL_SIZE
  const splashRadiusCells = thrower.stats.splashRadius ?? 1.5

  if (!state.boomerangs) state.boomerangs = []

  state.boomerangs.push({
    id: `boomerang_${nextBoomerangId++}`,
    owner: thrower.owner,
    throwerId: thrower.id,
    attackType: thrower.stats.attackType,
    damage,
    splashRadiusCells,
    dir,
    position: { ...thrower.position },
    origin: { ...thrower.position },
    travelLimitPx,
    phase: 'out',
    hitThisPass: new Set(),
  })

  state.events.push({
    type: 'BOOMERANG',
    throwerId: thrower.id,
    owner: thrower.owner,
    from: { ...thrower.position },
    dir: { ...dir },
    travelLimitPx,
  })
}

export function tickBoomerangs(state: GameState, deltaMs: number): void {
  if (!state.boomerangs?.length) return
  state.boomerangs = state.boomerangs.filter(b => stepBoomerang(b, deltaMs, state))
}
