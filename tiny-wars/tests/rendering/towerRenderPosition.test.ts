import { describe, it, expect } from 'vitest'
import { Owner } from '@core/types'
import { CELL_SIZE, BOT_KING_ROW, BOT_KING_VISUAL_ROW, BOT_TOWER_ROW, PLAYER_KING_ROW, PLAYER_KING_VISUAL_ROW, PLAYER_KING_COL, KING_MAP_CENTER_X, PRINCESS_TOWER_RENDER_NUDGE_Y, TOWER_HEALTH_BAR_Y } from '@data/GameConstants'
import {
  kingVisualAnchorY,
  towerAttackCenter,
  towerFootprintRiverEdge,
  towerHealthBarY,
  towerRenderY,
  towerRenderX,
  towerVisualBounds,
} from '@rendering/towerRenderPosition'

describe('towerRenderPosition', () => {
  const botLogicY = BOT_TOWER_ROW * CELL_SIZE + CELL_SIZE / 2
  const playerLogicY = 35 * CELL_SIZE + CELL_SIZE / 2

  it('nudges bot princess sprite toward the river', () => {
    const bounds = towerVisualBounds(botLogicY, Owner.BOT, false)
    expect(bounds.bottom).toBeCloseTo(bounds.riverEdge + PRINCESS_TOWER_RENDER_NUDGE_Y.bot, 0)
  })

  it('nudges player princess sprite toward the river', () => {
    const bounds = towerVisualBounds(playerLogicY, Owner.PLAYER, false)
    expect(bounds.top).toBeCloseTo(bounds.riverEdge + PRINCESS_TOWER_RENDER_NUDGE_Y.player, 0)
  })

  it('does not nudge king castle render position', () => {
    const bounds = towerVisualBounds(botLogicY, Owner.BOT, true)
    expect(bounds.bottom).toBeCloseTo(bounds.riverEdge, 0)
  })

  it('derives render Y from footprint river edge', () => {
    const river = towerFootprintRiverEdge(botLogicY, Owner.BOT, true)
    const ry = towerRenderY(botLogicY, Owner.BOT, true)
    const half = towerVisualBounds(botLogicY, Owner.BOT, true).height / 2
    expect(ry).toBeCloseTo(river - half, 0)
  })

  it('places bot king health bar above the castle toward the bot side', () => {
    const botKingLogicY = BOT_KING_ROW * CELL_SIZE + CELL_SIZE / 2
    const bounds = towerVisualBounds(botKingLogicY, Owner.BOT, true)
    const barY = towerHealthBarY(botKingLogicY, Owner.BOT, true, bounds.height)

    expect(barY).toBeLessThan(bounds.top)
    expect(barY).toBeCloseTo(bounds.top - TOWER_HEALTH_BAR_Y.botGapAboveTop, 0)
  })

  it('places player king health bar inside the castle toward the arena', () => {
    const playerKingLogicY = PLAYER_KING_ROW * CELL_SIZE + CELL_SIZE / 2
    const bounds = towerVisualBounds(playerKingLogicY, Owner.PLAYER, true)
    const barY = towerHealthBarY(playerKingLogicY, Owner.PLAYER, true, bounds.height)

    expect(barY).toBeGreaterThan(bounds.top)
    expect(barY).toBeLessThan(bounds.bottom)
    expect(barY).toBeCloseTo(bounds.renderY + TOWER_HEALTH_BAR_Y.playerOffsetFromCenter, 0)
  })

  it('keeps king castle visuals at visual rows when hitbox rows differ', () => {
    const botHitboxY = BOT_KING_ROW * CELL_SIZE + CELL_SIZE / 2
    const botVisualY = BOT_KING_VISUAL_ROW * CELL_SIZE + CELL_SIZE / 2
    expect(kingVisualAnchorY(botHitboxY, Owner.BOT)).toBeCloseTo(botVisualY, 0)

    const plyHitboxY = PLAYER_KING_ROW * CELL_SIZE + CELL_SIZE / 2
    const plyVisualY = PLAYER_KING_VISUAL_ROW * CELL_SIZE + CELL_SIZE / 2
    expect(kingVisualAnchorY(plyHitboxY, Owner.PLAYER)).toBeCloseTo(plyVisualY, 0)
  })

  it('keeps king tower attack range centred on visual row when hitbox row differs', () => {
    const logicX = PLAYER_KING_COL * CELL_SIZE + CELL_SIZE / 2
    const botHitboxY = BOT_KING_ROW * CELL_SIZE + CELL_SIZE / 2
    const botVisualY = BOT_KING_VISUAL_ROW * CELL_SIZE + CELL_SIZE / 2
    const botAttack = towerAttackCenter(logicX, botHitboxY, Owner.BOT, true)
    expect(botAttack.x).toBe(logicX)
    expect(botAttack.y).toBeCloseTo(botVisualY, 0)

    const plyHitboxY = PLAYER_KING_ROW * CELL_SIZE + CELL_SIZE / 2
    const plyVisualY = PLAYER_KING_VISUAL_ROW * CELL_SIZE + CELL_SIZE / 2
    const plyAttack = towerAttackCenter(logicX, plyHitboxY, Owner.PLAYER, true)
    expect(plyAttack.y).toBeCloseTo(plyVisualY, 0)
  })

  it('centers king castle sprite on true map centre for even-width grid', () => {
    const logicX = PLAYER_KING_COL * CELL_SIZE + CELL_SIZE / 2
    expect(towerRenderX(logicX, Owner.PLAYER, true)).toBeCloseTo(KING_MAP_CENTER_X, 0)
    expect(towerRenderX(logicX, Owner.BOT, true)).toBeCloseTo(KING_MAP_CENTER_X, 0)
  })
})
