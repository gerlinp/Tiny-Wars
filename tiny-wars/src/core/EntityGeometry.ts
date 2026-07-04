import type { Entity } from './entities/Entity'
import { Building } from './entities/Building'
import { Tower } from './entities/Tower'
import { EntityKind } from './types'
import type { Vec2 } from './types'
import { dist } from './Vector2'
import { CELL_SIZE, GRID_COLS, GRID_ROWS, EPSILON_DISTANCE, TROOP_COLLISION_RADIUS_CELLS, BUILDING_COMBAT_RADIUS_CELLS, BUILDING_FOOTPRINT_CELLS, BOMB_TOWER_CARD_ID } from '@data/GameConstants'
import { collisionHalfExtentsForTower, towerCombatRadius } from '@rendering/assetDisplaySize'
import { towerCollisionCenter } from '@rendering/towerRenderPosition'

export interface HalfExtents {
  halfW: number
  halfH: number
}

export function troopCollisionHalf(): HalfExtents {
  const r = TROOP_COLLISION_RADIUS_CELLS * CELL_SIZE
  return { halfW: r, halfH: r }
}

/** Combat circle radius for entities that use circular hulls (world pixels). */
export function entityCombatRadius(entity: Entity): number | null {
  if (entity.kind === EntityKind.TROOP) return troopCollisionRadius(entity)
  if (entity.kind === EntityKind.BUILDING) return (entity as Building).combatRadiusPx
  if (entity.kind === EntityKind.TOWER) return towerCombatRadius((entity as Tower).isKing)
  return null
}

function edgeDistBetweenCircleEntities(a: Entity, b: Entity, rA: number, rB: number): number {
  const d = dist(entityCollisionCenter(a), entityCollisionCenter(b))
  return Math.max(0, d - rA - rB)
}

/** Small circular combat radius at a troop's feet (world pixels). */
export function troopCollisionRadius(entity?: Entity): number {
  const custom = entity && entity.kind === EntityKind.TROOP
    ? (entity as { stats?: { collisionRadiusCells?: number } }).stats?.collisionRadiusCells
    : undefined
  return (custom ?? TROOP_COLLISION_RADIUS_CELLS) * CELL_SIZE
}

/** CR-style fixed combat radius for generic deployed buildings (world pixels). */
export function buildingCombatRadius(building?: Building): number {
  if (building) return building.combatRadiusPx
  return BUILDING_COMBAT_RADIUS_CELLS * CELL_SIZE
}

/** Combat circle centre for a building — anchored at deploy base (bomb tower matches towers). */
export function buildingCombatCenter(building: Building): Vec2 {
  if (building.cardId === BOMB_TOWER_CARD_ID) {
    return { x: building.position.x, y: building.position.y }
  }
  const r = building.combatRadiusPx
  return { x: building.position.x, y: building.position.y - r }
}

export function circlesOverlap(posA: Vec2, rA: number, posB: Vec2, rB: number): boolean {
  const dx = posA.x - posB.x
  const dy = posA.y - posB.y
  const sum = rA + rB
  return dx * dx + dy * dy < sum * sum
}

/** Separate two overlapping circles; moveRatioA is the fraction applied to posA.
 *  fraction < 1 allows soft/damped separation (units tolerate partial overlap). */
export function separateCirclePair(
  posA: Vec2,
  rA: number,
  posB: Vec2,
  rB: number,
  moveRatioA = 0.5,
  fraction = 1.0,
): void {
  const dx = posA.x - posB.x
  const dy = posA.y - posB.y
  let dist = Math.hypot(dx, dy)
  const minDist = rA + rB

  if (dist >= minDist) return

  const PUSH_MARGIN = 1e-6
  if (dist < EPSILON_DISTANCE) {
    posA.x += (minDist + PUSH_MARGIN) * moveRatioA * fraction
    posB.x -= (minDist + PUSH_MARGIN) * (1 - moveRatioA) * fraction
    return
  }

  const overlap = (minDist - dist + PUSH_MARGIN) * fraction
  const nx = dx / dist
  const ny = dy / dist
  posA.x += nx * overlap * moveRatioA
  posA.y += ny * overlap * moveRatioA
  posB.x -= nx * overlap * (1 - moveRatioA)
  posB.y -= ny * overlap * (1 - moveRatioA)
}

/** Buildings use a small combat circle; towers/troops use their footprint hulls. */
export function entityCollisionCenter(entity: Entity): Vec2 {
  if (entity.kind === EntityKind.BUILDING) {
    return buildingCombatCenter(entity as Building)
  }
  if (entity.kind === EntityKind.TOWER) {
    const tower = entity as Tower
    return towerCollisionCenter(tower.position.x, tower.position.y)
  }
  return entity.position
}

export function entityHalfExtents(entity: Entity): HalfExtents {
  if (entity.kind === EntityKind.BUILDING) {
    const r = (entity as Building).combatRadiusPx
    return { halfW: r, halfH: r }
  }
  if (entity.kind === EntityKind.TOWER) {
    const tower = entity as Tower
    return collisionHalfExtentsForTower(tower.isKing)
  }
  if (entity.kind === EntityKind.TROOP) {
    return troopCollisionHalf()
  }
  return troopCollisionHalf()
}

/** Distance from a point to the nearest edge of an entity's combat hull. */
export function surfaceDistToEntity(from: Vec2, target: Entity): number {
  const center = entityCollisionCenter(target)
  const d = dist(from, center)
  if (d < EPSILON_DISTANCE) return 0

  const combatR = entityCombatRadius(target)
  if (combatR !== null) return Math.max(0, d - combatR)

  const half = entityHalfExtents(target)
  const nx = (from.x - center.x) / d
  const ny = (from.y - center.y) / d
  const extent = Math.abs(nx) * half.halfW + Math.abs(ny) * half.halfH
  return Math.max(0, d - extent)
}

/** Distance between the nearest edges of two entities' combat shapes. */
export function edgeDistBetweenEntities(fromEntity: Entity, toEntity: Entity): number {
  const rA = entityCombatRadius(fromEntity)
  const rB = entityCombatRadius(toEntity)
  if (rA !== null && rB !== null) {
    return edgeDistBetweenCircleEntities(fromEntity, toEntity, rA, rB)
  }

  const centerA = entityCollisionCenter(fromEntity)
  const centerB = entityCollisionCenter(toEntity)
  const dx = centerB.x - centerA.x
  const dy = centerB.y - centerA.y
  const d = Math.hypot(dx, dy)
  if (d < EPSILON_DISTANCE) return 0

  const halfA = entityHalfExtents(fromEntity)
  const halfB = entityHalfExtents(toEntity)
  const nx = dx / d
  const ny = dy / d
  const extentA = Math.abs(nx) * halfA.halfW + Math.abs(ny) * halfA.halfH
  const extentB = Math.abs(nx) * halfB.halfW + Math.abs(ny) * halfB.halfH
  return Math.max(0, d - extentA - extentB)
}

/** Standoff point where a melee attacker can strike at `rangeCells` edge-to-edge gap.
 * Stops slightly inside the attack range (APPROACH_SLACK) so floating-point rounding
 * never leaves the unit just outside and unable to trigger the attack check. */
export function meleeApproachPoint(
  from: Vec2,
  attacker: Entity,
  target: Entity,
  rangeCells: number,
): Vec2 {
  const center = entityCollisionCenter(target)
  const d = dist(from, center)
  if (d < EPSILON_DISTANCE) return { x: from.x, y: from.y }

  const nx = (from.x - center.x) / d
  const ny = (from.y - center.y) / d

  const APPROACH_SLACK = CELL_SIZE * 0.5

  const targetR = entityCombatRadius(target)
  const attackerR = entityCombatRadius(attacker)
  if (targetR !== null && attackerR !== null) {
    const centerDist = rangeCells * CELL_SIZE + targetR + attackerR - APPROACH_SLACK
    return { x: center.x + nx * centerDist, y: center.y + ny * centerDist }
  }

  const halfT = entityHalfExtents(target)
  const halfA = entityHalfExtents(attacker)
  const targetExtent = Math.abs(nx) * halfT.halfW + Math.abs(ny) * halfT.halfH
  const attackerExtent = Math.abs(nx) * halfA.halfW + Math.abs(ny) * halfA.halfH
  const centerDist = rangeCells * CELL_SIZE + targetExtent + attackerExtent - APPROACH_SLACK

  return {
    x: center.x + nx * centerDist,
    y: center.y + ny * centerDist,
  }
}

/** World point just outside the target's combat hull, facing the attacker. */
export function approachPointOnSurface(from: Vec2, target: Entity, margin = 2): Vec2 {
  const center = entityCollisionCenter(target)
  const d = dist(from, center)
  if (d < EPSILON_DISTANCE) return { x: center.x, y: center.y }

  const nx = (from.x - center.x) / d
  const ny = (from.y - center.y) / d

  const combatR = entityCombatRadius(target)
  if (combatR !== null) {
    const stopDist = combatR + margin
    return { x: center.x + nx * stopDist, y: center.y + ny * stopDist }
  }

  const half = entityHalfExtents(target)
  const extent = Math.abs(nx) * half.halfW + Math.abs(ny) * half.halfH
  const stopDist = extent + margin

  return {
    x: center.x + nx * stopDist,
    y: center.y + ny * stopDist,
  }
}

/** Push a troop out of overlapping entity collision boxes. */
export function resolveEntityOverlap(pos: Vec2, moverHalf: number, blocker: Entity): void {
  const half = entityHalfExtents(blocker)
  const center = entityCollisionCenter(blocker)
  const dx = pos.x - center.x
  const dy = pos.y - center.y
  const overlapX = (moverHalf + half.halfW) - Math.abs(dx)
  const overlapY = (moverHalf + half.halfH) - Math.abs(dy)

  if (overlapX <= 0 || overlapY <= 0) return

  if (overlapX < overlapY) {
    pos.x += overlapX * Math.sign(dx || 1)
  } else {
    pos.y += overlapY * Math.sign(dy || 1)
  }
}

export function boxesOverlap(
  posA: Vec2,
  halfA: HalfExtents,
  posB: Vec2,
  halfB: HalfExtents,
): boolean {
  return Math.abs(posA.x - posB.x) < halfA.halfW + halfB.halfW
    && Math.abs(posA.y - posB.y) < halfA.halfH + halfB.halfH
}

/** Separate two axis-aligned boxes; moveRatioA is the fraction applied to posA (1 = only A moves). */
export function separateBoxPair(
  posA: Vec2,
  halfA: HalfExtents,
  posB: Vec2,
  halfB: HalfExtents,
  moveRatioA = 0.5,
): void {
  const dx = posA.x - posB.x
  const dy = posA.y - posB.y
  const overlapX = halfA.halfW + halfB.halfW - Math.abs(dx)
  const overlapY = halfA.halfH + halfB.halfH - Math.abs(dy)

  if (overlapX <= 0 || overlapY <= 0) return

  if (overlapX < overlapY) {
    const push = overlapX * Math.sign(dx || 1)
    posA.x += push * moveRatioA
    posB.x -= push * (1 - moveRatioA)
  } else {
    const push = overlapY * Math.sign(dy || 1)
    posA.y += push * moveRatioA
    posB.y -= push * (1 - moveRatioA)
  }
}

/** Push a moving troop out of a static or peer entity. */
export function pushTroopOutOfEntity(moverPos: Vec2, mover: Entity, blocker: Entity): void {
  const blockerR = entityCombatRadius(blocker)
  if (blockerR !== null) {
    separateCirclePair(
      moverPos,
      troopCollisionRadius(mover),
      entityCollisionCenter(blocker),
      blockerR,
      1,
    )
    return
  }
  separateBoxPair(
    moverPos,
    entityHalfExtents(mover),
    entityCollisionCenter(blocker),
    entityHalfExtents(blocker),
    1,
  )
}

/** Grid cells blocked by a deployed building's path footprint (CR 2×2). */
export function buildingBlockedCells(position: Vec2): Vec2[] {
  const anchorCol = Math.round((position.x - CELL_SIZE / 2) / CELL_SIZE)
  const anchorRow = Math.round((position.y - CELL_SIZE / 2) / CELL_SIZE)
  const w = BUILDING_FOOTPRINT_CELLS.w
  const h = BUILDING_FOOTPRINT_CELLS.h
  const startCol = anchorCol - Math.floor(w / 2)
  const startRow = anchorRow - h + 1
  const cells: Vec2[] = []

  for (let row = startRow; row < startRow + h; row++) {
    for (let col = startCol; col < startCol + w; col++) {
      if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        cells.push({ x: col, y: row })
      }
    }
  }

  return cells
}

/** Grid cells covered by a building's image-sized footprint. */
export function gridCellsForFootprint(center: Vec2, halfW: number, halfH: number): Vec2[] {
  const minCol = Math.floor((center.x - halfW) / CELL_SIZE)
  // Half-open upper edge: an edge landing exactly on a cell boundary must NOT
  // claim the zero-area cell beyond it (otherwise footprints skew right/down
  // of the sprite whenever the centre sits on a cell centre or corner).
  const maxCol = Math.ceil((center.x + halfW) / CELL_SIZE) - 1
  const minRow = Math.floor((center.y - halfH) / CELL_SIZE)
  const maxRow = Math.ceil((center.y + halfH) / CELL_SIZE) - 1
  const cells: Vec2[] = []

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        cells.push({ x: col, y: row })
      }
    }
  }

  return cells
}
