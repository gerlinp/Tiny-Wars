import { describe, it, expect } from 'vitest'
import { bombArcScale } from '@rendering/bombProjectileVisual'
import {
  rocketFlightMs,
  ROCKET_LOB_SPEED_CELLS_PER_MIN,
  ROCKET_MIN_FLIGHT_MS,
  ROCKET_MAX_FLIGHT_MS,
} from '@data/ProjectileConstants'
import { CELL_SIZE, PLAYER_KING_ROW, BOT_KING_ROW } from '@data/GameConstants'

describe('bombArcScale', () => {
  it('starts and ends at base scale', () => {
    expect(bombArcScale(0)).toBe(1)
    expect(bombArcScale(1)).toBe(1)
  })

  it('peaks at the halfway point', () => {
    expect(bombArcScale(0.5)).toBeGreaterThan(1)
    expect(bombArcScale(0.25)).toBeLessThan(bombArcScale(0.5))
    expect(bombArcScale(0.75)).toBeLessThan(bombArcScale(0.5))
  })

  it('stays constant when peak scale is 1 (tower cannon lobs)', () => {
    expect(bombArcScale(0, 1)).toBe(1)
    expect(bombArcScale(0.5, 1)).toBe(1)
    expect(bombArcScale(1, 1)).toBe(1)
  })
})

describe('rocketFlightMs', () => {
  it('uses Clash Royale Rocket lob speed (350 tiles/min)', () => {
    const twentyCellsPx = 20 * CELL_SIZE
    expect(rocketFlightMs(twentyCellsPx)).toBe(
      Math.round((20 / ROCKET_LOB_SPEED_CELLS_PER_MIN) * 60_000),
    )
  })

  it('matches ~3.6s for a ~20.5 tile princess-tower lob', () => {
    const ms = rocketFlightMs(20.5 * CELL_SIZE)
    expect(ms).toBeGreaterThanOrEqual(3400)
    expect(ms).toBeLessThanOrEqual(3800)
  })

  it('matches ~4s for a ~23.5 tile king-tower lob', () => {
    const ms = rocketFlightMs(23.5 * CELL_SIZE)
    expect(ms).toBeGreaterThanOrEqual(3900)
    expect(ms).toBeLessThanOrEqual(4200)
  })

  it('takes ~6.5s for a king-to-king vertical lob in this arena', () => {
    const kingSpanCells = PLAYER_KING_ROW - BOT_KING_ROW
    const ms = rocketFlightMs(kingSpanCells * CELL_SIZE)
    expect(ms).toBeGreaterThanOrEqual(6000)
    expect(ms).toBeLessThanOrEqual(6800)
  })

  it('enforces a minimum visible lob duration for very short throws', () => {
    expect(rocketFlightMs(2 * CELL_SIZE)).toBe(ROCKET_MIN_FLIGHT_MS)
  })

  it('clamps extremely long shots', () => {
    expect(rocketFlightMs(CELL_SIZE)).toBe(ROCKET_MIN_FLIGHT_MS)
    expect(rocketFlightMs(100 * CELL_SIZE)).toBe(ROCKET_MAX_FLIGHT_MS)
  })
})
