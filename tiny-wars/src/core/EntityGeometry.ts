import type { Entity } from './entities/Entity'
import { Building } from './entities/Building'
import { Tower } from './entities/Tower'
import { EntityKind } from './types'
import type { Vec2 } from './types'
import { dist } from './Vector2'
import { CELL_SIZE, GRID_COLS, GRID_ROWS } from '@data/GameConstants'
import { collisionHalfExtentsForCard, collisionHalfExtentsForTower } from '@rendering/assetDisplaySize'
import { towerCollisionCenter } from '@rendering/towerRenderPosition'

export interface HalfExtents {
  halfW: number
  halfH: number
}

export function troopCollisionHalf(): HalfExtents {
  const half = CELL_SIZE / 2
  return { halfW: half, halfH: half }
}

/** Buildings anchor at their base; towers anchor footprint to the visual sprite base. */
export function entityCollisionCenter(entity: Entity): Vec2 {
  if (entity.kind === EntityKind.BUILDING) {
    const building = entity as Building
    return { x: building.position.x, y: building.position.y - building.halfH }
  }
  if (entity.kind === EntityKind.TOWER) {
    const tower = entity as Tower
    return towerCollisionCenter(tower.position.x, tower.position.y)
  }
  return entity.position
}

export function entityHalfExtents(entity: Entity): HalfExtents {
  if (entity.kind === EntityKind.BUILDING) {
    const building = entity as Building
    return { halfW: building.halfW, halfH: building.halfH }
  }
  if (entity.kind === EntityKind.TOWER) {
    const tower = entity as Tower
    return collisionHalfExtentsForTower(tower.isKing)
  }
  if (entity.cardId) {
    return collisionHalfExtentsForCard(entity.cardId)
  }
  return troopCollisionHalf()
}

/** Distance from a point to the nearest edge of an entity's collision box. */
export function surfaceDistToEntity(from: Vec2, target: Entity): number {
  const center = entityCollisionCenter(target)
  const d = dist(from, center)
  if (d < 0.01) return 0

  const half = entityHalfExtents(target)
  const nx = (from.x - center.x) / d
  const ny = (from.y - center.y) / d
  const extent = Math.abs(nx) * half.halfW + Math.abs(ny) * half.halfH
  return Math.max(0, d - extent)
}

/** World point just outside the target's collision box, facing the attacker. */
export function approachPointOnSurface(from: Vec2, target: Entity, margin = 2): Vec2 {
  const center = entityCollisionCenter(target)
  const d = dist(from, center)
  if (d < 0.01) return { x: center.x, y: center.y }

  const half = entityHalfExtents(target)
  const nx = (from.x - center.x) / d
  const ny = (from.y - center.y) / d
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

/** Push a moving troop out of a static or peer entity using per-card body boxes. */
export function pushTroopOutOfEntity(moverPos: Vec2, mover: Entity, blocker: Entity): void {
  separateBoxPair(
    moverPos,
    entityHalfExtents(mover),
    entityCollisionCenter(blocker),
    entityHalfExtents(blocker),
    1,
  )
}

/** Grid cells covered by a building's image-sized footprint. */
export function gridCellsForFootprint(center: Vec2, halfW: number, halfH: number): Vec2[] {
  const minCol = Math.floor((center.x - halfW) / CELL_SIZE)
  const maxCol = Math.floor((center.x + halfW) / CELL_SIZE)
  const minRow = Math.floor((center.y - halfH) / CELL_SIZE)
  const maxRow = Math.floor((center.y + halfH) / CELL_SIZE)
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
