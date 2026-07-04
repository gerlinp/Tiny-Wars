import { describe, it, expect } from 'vitest'
import { Owner } from '@core/types'
import { CELL_SIZE, BOT_KING_ROW, BOT_KING_VISUAL_ROW, BOT_TOWER_ROW, PLAYER_KING_ROW, PLAYER_TOWER_ROW, PLAYER_KING_VISUAL_ROW, PLAYER_KING_COL, KING_MAP_CENTER_X, PRINCESS_TOWER_RENDER_NUDGE_Y, TOWER_HEALTH_BAR_Y } from '@data/GameConstants'
import { BOT_KING_TOWER_MELEE, PLAYER_KING_TOWER_MELEE } from '@data/KingTowerMeleeLayout'
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

  it('centres princess sprites on their logic anchor (plus configurable nudge)', () => {
    expect(towerRenderY(botLogicY, Owner.BOT, false))
      .toBeCloseTo(botLogicY + PRINCESS_TOWER_RENDER_NUDGE_Y.bot, 5)
    expect(towerRenderY(playerLogicY, Owner.PLAYER, false))
      .toBeCloseTo(playerLogicY + PRINCESS_TOWER_RENDER_NUDGE_Y.player, 5)
  })

  it('centres king castle on its visual row anchor', () => {
    const botKingLogicY = BOT_KING_ROW * CELL_SIZE + CELL_SIZE / 2
    const expected = botKingLogicY + (BOT_KING_VISUAL_ROW - BOT_KING_ROW) * CELL_SIZE
    expect(towerRenderY(botKingLogicY, Owner.BOT, true)).toBeCloseTo(expected, 5)
  })

  it('keeps the footprint river edge on the correct side of the anchor', () => {
    const river = towerFootprintRiverEdge(botLogicY, Owner.BOT, false)
    expect(river).toBeGreaterThan(botLogicY)
    const playerRiver = towerFootprintRiverEdge(playerLogicY, Owner.PLAYER, false)
    expect(playerRiver).toBeLessThan(playerLogicY)
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

  it('keeps king tower attack range centred on editor rangeCenterOffset from logic anchor', () => {
    const logicX = PLAYER_KING_COL * CELL_SIZE + CELL_SIZE / 2
    const botHitboxY = BOT_KING_ROW * CELL_SIZE + CELL_SIZE / 2
    const botAttack = towerAttackCenter(logicX, botHitboxY, Owner.BOT, true)
    expect(botAttack.x).toBe(logicX)
    expect(botAttack.y).toBeCloseTo(botHitboxY - 7.7 * CELL_SIZE, 0)

    const plyHitboxY = PLAYER_KING_ROW * CELL_SIZE + CELL_SIZE / 2
    const plyAttack = towerAttackCenter(logicX, plyHitboxY, Owner.PLAYER, true)
    expect(plyAttack.y).toBeCloseTo(plyHitboxY + 7.7 * CELL_SIZE, 0)
  })

  it('mirrors king tower anchors and range centers across the map', () => {
    const RIVER_AXIS = 15.5  // river spans rows 15-16; mirror axis between them
    const mirrorRow = (r: number) => 31 - r

    expect(PLAYER_KING_ROW).toBe(mirrorRow(BOT_KING_ROW))
    expect(PLAYER_TOWER_ROW).toBe(mirrorRow(BOT_TOWER_ROW))
    expect(PLAYER_KING_ROW - RIVER_AXIS).toBe(RIVER_AXIS - BOT_KING_ROW)
    expect(PLAYER_KING_ROW - PLAYER_TOWER_ROW).toBe(BOT_TOWER_ROW - BOT_KING_ROW)

    const botCenterRow = BOT_KING_ROW + BOT_KING_TOWER_MELEE.rangeCenterOffsetCells.y
    const plyCenterRow = PLAYER_KING_ROW + PLAYER_KING_TOWER_MELEE.rangeCenterOffsetCells.y
    expect(plyCenterRow).toBeCloseTo(mirrorRow(botCenterRow), 5)
    expect(PLAYER_KING_TOWER_MELEE.rangeCenterOffsetCells.y)
      .toBeCloseTo(-BOT_KING_TOWER_MELEE.rangeCenterOffsetCells.y, 5)
  })

  it('centers king castle sprite on true map centre for even-width grid', () => {
    const logicX = PLAYER_KING_COL * CELL_SIZE + CELL_SIZE / 2
    expect(logicX).toBeCloseTo(KING_MAP_CENTER_X, 0)
    expect(towerRenderX(logicX, Owner.PLAYER, true)).toBeCloseTo(KING_MAP_CENTER_X, 0)
    expect(towerRenderX(logicX, Owner.BOT, true)).toBeCloseTo(KING_MAP_CENTER_X, 0)
  })

  it('places king logic col symmetrically between princess towers', () => {
    const [left, right] = [3, 14]
    expect(left - PLAYER_KING_COL).toBeCloseTo(-(right - PLAYER_KING_COL), 5)
    expect(right - PLAYER_KING_COL).toBeCloseTo(5.5, 5)
  })
})
