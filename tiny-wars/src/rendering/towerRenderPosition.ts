import { getActiveMapConfig } from '@data/ActiveMapConfig'
import {
  CELL_SIZE,
  PRINCESS_TOWER_RENDER_NUDGE_Y,
  TOWER_HEALTH_BAR_Y,
  towerFootprintHalfExtents,
} from '@data/GameConstants'
import type { TowerHealthBarKey } from '@data/MapConfig'
import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { targetHeightForTower } from '@rendering/assetDisplaySize'

export type { TowerHealthBarKey }

function logicColFromX(logicX: number): number {
  return Math.round((logicX - CELL_SIZE / 2) / CELL_SIZE)
}

/** Map-editor key for a tower health bar slot. */
export function towerHealthBarKey(owner: Owner, isKing: boolean, logicCol: number): TowerHealthBarKey {
  if (isKing) return owner === Owner.PLAYER ? 'plyKing' : 'botKing'
  const cfg = getActiveMapConfig()
  const cols = owner === Owner.PLAYER
    ? (cfg?.playerTowerCols ?? [4, 19])
    : (cfg?.botTowerCols ?? [4, 19])
  const isLeft = Math.abs(logicCol - cols[0]) <= Math.abs(logicCol - cols[1])
  if (owner === Owner.PLAYER) return isLeft ? 'plyLeft' : 'plyRight'
  return isLeft ? 'botLeft' : 'botRight'
}

function towerHealthBarOffset(
  owner: Owner,
  isKing: boolean,
  logicX: number,
): { offsetX: number; offsetY: number } | null {
  const cfg = getActiveMapConfig()?.towerHealthBars
  if (!cfg) return null
  const key = towerHealthBarKey(owner, isKing, logicColFromX(logicX))
  const hb = cfg[key]
  if (!hb || (hb.offsetX === undefined && hb.offsetY === undefined)) return null
  return { offsetX: hb.offsetX ?? 0, offsetY: hb.offsetY ?? 0 }
}

function towerVisualOffset(
  owner: Owner,
  isKing: boolean,
  logicX: number,
): { offsetX: number; offsetY: number } | null {
  const cfg = getActiveMapConfig()?.towerVisualOffsets
  if (!cfg) return null
  const key = towerHealthBarKey(owner, isKing, logicColFromX(logicX))
  const vis = cfg[key]
  if (!vis || (vis.offsetX === undefined && vis.offsetY === undefined)) return null
  return { offsetX: vis.offsetX ?? 0, offsetY: vis.offsetY ?? 0 }
}

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
export function towerRenderY(logicY: number, owner: Owner, isKing: boolean, logicX?: number): number {
  if (logicX !== undefined) {
    const vis = towerVisualOffset(owner, isKing, logicX)
    if (vis) return logicY + vis.offsetY
  }
  const riverEdge = towerFootprintRiverEdge(logicY, owner, isKing)
  const halfDisplay = targetHeightForTower(isKing) / 2
  const base = owner === Owner.PLAYER ? riverEdge + halfDisplay : riverEdge - halfDisplay
  return base + princessRenderNudgeY(owner, isKing)
}

/** Sprite X — map.json override or tower logic centre. */
export function towerRenderX(logicX: number, owner: Owner, isKing: boolean): number {
  const vis = towerVisualOffset(owner, isKing, logicX)
  return vis ? logicX + vis.offsetX : logicX
}

/** Visible sprite bounds (origin 0.5, 0.5) — matches TowerSprite layout. */
export function towerVisualBounds(
  logicY: number,
  owner: Owner,
  isKing: boolean,
  logicX?: number,
): {
  top: number
  bottom: number
  renderY: number
  height: number
  riverEdge: number
} {
  const renderY = towerRenderY(logicY, owner, isKing, logicX)
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

/** Health bar X — map.json override or tower logic centre. */
export function towerHealthBarX(logicX: number, owner: Owner, isKing: boolean): number {
  const off = towerHealthBarOffset(owner, isKing, logicX)
  return off ? logicX + off.offsetX : logicX
}

/**
 * Health bar anchor — Clash Royale style, or map-editor override from map.json.
 * Player: overlaid on the upper-middle of the tower sprite (toward the arena).
 * Bot: floating above the tower toward the bot deploy zone.
 */
export function towerHealthBarY(
  logicY: number,
  owner: Owner,
  isKing: boolean,
  _spriteHeight: number,
  logicX?: number,
): number {
  if (logicX !== undefined) {
    const off = towerHealthBarOffset(owner, isKing, logicX)
    if (off) return logicY + off.offsetY
  }
  const { renderY, top } = towerVisualBounds(logicY, owner, isKing, logicX)
  if (owner === Owner.PLAYER) {
    return renderY + TOWER_HEALTH_BAR_Y.playerOffsetFromCenter
  }
  return top - TOWER_HEALTH_BAR_Y.botGapAboveTop
}

/** @deprecated Use towerFootprintRiverEdge */
export function towerRiverFacingEdge(logicY: number, owner: Owner, isKing: boolean): number {
  return towerFootprintRiverEdge(logicY, owner, isKing)
}
