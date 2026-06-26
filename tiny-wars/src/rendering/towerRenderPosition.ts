import { PRINCESS_TOWER_RENDER_NUDGE_Y, towerFootprintHalfExtents } from '@data/GameConstants'
import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { targetHeightForTower } from '@rendering/assetDisplaySize'

/** River-facing edge of the tower's grid footprint (world Y). */
export function towerFootprintRiverEdge(logicY: number, owner: Owner, isKing: boolean): number {
  const halfH = towerFootprintHalfExtents(isKing).halfH
  // Player: attack surface on north (top). Bot: attack surface on south (bottom).
  return owner === Owner.PLAYER ? logicY - halfH : logicY + halfH
}

/** Grid footprint centre — logic cell anchor. */
export function towerCollisionCenter(logicX: number, logicY: number): Vec2 {
  return { x: logicX, y: logicY }
}

function princessRenderNudgeY(owner: Owner, isKing: boolean): number {
  if (isKing) return 0
  return owner === Owner.PLAYER
    ? PRINCESS_TOWER_RENDER_NUDGE_Y.player
    : PRINCESS_TOWER_RENDER_NUDGE_Y.bot
}

/**
 * Same unflipped art on both sides; position so the footprint river edge meets the
 * sprite top (player) or bottom (bot). Princess towers get an extra nudge toward
 * the river so visible stone base lines up with the hitbox (PNG padding).
 */
export function towerRenderY(logicY: number, owner: Owner, isKing: boolean): number {
  const riverEdge = towerFootprintRiverEdge(logicY, owner, isKing)
  const halfDisplay = targetHeightForTower(isKing) / 2
  const base = owner === Owner.PLAYER ? riverEdge + halfDisplay : riverEdge - halfDisplay
  return base + princessRenderNudgeY(owner, isKing)
}

/** Visible sprite bounds (origin 0.5, 0.5) — matches TowerSprite layout. */
export function towerVisualBounds(logicY: number, owner: Owner, isKing: boolean): {
  top: number
  bottom: number
  renderY: number
  height: number
  riverEdge: number
} {
  const renderY = towerRenderY(logicY, owner, isKing)
  const height = targetHeightForTower(isKing)
  const halfH = height / 2
  return {
    renderY,
    height,
    top: renderY - halfH,
    bottom: renderY + halfH,
    riverEdge: towerFootprintRiverEdge(logicY, owner, isKing),
  }
}

/**
 * Health bar anchor — outside the sprite on the arena-facing side.
 * Player towers: above the north edge; bot towers: below the south edge (toward the player).
 */
export function towerHealthBarY(
  logicY: number,
  owner: Owner,
  isKing: boolean,
  spriteHeight: number,
): number {
  const { renderY } = towerVisualBounds(logicY, owner, isKing)
  const halfH = spriteHeight / 2
  const margin = 6
  return owner === Owner.PLAYER
    ? renderY - halfH - margin   // player towers at screen-bottom — bar goes north (toward arena)
    : renderY + halfH + margin   // bot towers at screen-top — bar goes south (toward arena)
}

/** @deprecated Use towerFootprintRiverEdge */
export function towerRiverFacingEdge(logicY: number, owner: Owner, isKing: boolean): number {
  return towerFootprintRiverEdge(logicY, owner, isKing)
}
