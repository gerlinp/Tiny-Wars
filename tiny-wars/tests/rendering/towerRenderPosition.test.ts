import { describe, it, expect } from 'vitest'
import { Owner } from '@core/types'
import { CELL_SIZE, BOT_KING_ROW, BOT_TOWER_ROW, PRINCESS_TOWER_RENDER_NUDGE_Y, TOWER_HEALTH_BAR_Y } from '@data/GameConstants'
import {
  towerFootprintRiverEdge,
  towerHealthBarY,
  towerRenderY,
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
    expect(barY).toBeGreaterThan(0)
    expect(barY).toBeCloseTo(bounds.top - TOWER_HEALTH_BAR_Y.botGapAboveTop, 0)
  })

  it('places player king health bar inside the castle toward the arena', () => {
    const playerKingLogicY = 37 * CELL_SIZE + CELL_SIZE / 2
    const bounds = towerVisualBounds(playerKingLogicY, Owner.PLAYER, true)
    const barY = towerHealthBarY(playerKingLogicY, Owner.PLAYER, true, bounds.height)

    expect(barY).toBeGreaterThan(bounds.top)
    expect(barY).toBeLessThan(bounds.bottom)
    expect(barY).toBeCloseTo(bounds.renderY + TOWER_HEALTH_BAR_Y.playerOffsetFromCenter, 0)
  })
})
