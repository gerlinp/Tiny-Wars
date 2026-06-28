import { describe, it, expect } from 'vitest'
import { arrowFlightMs, rocketFlightMs } from '@data/ProjectileConstants'
import { CELL_SIZE } from '@data/GameConstants'

describe('arrowFlightMs', () => {
  it('archer-like unit (~1 attack/sec → ~420ms flight)', () => {
    const ms = arrowFlightMs(100, 1.0)
    expect(ms).toBeGreaterThanOrEqual(380)
    expect(ms).toBeLessThanOrEqual(550)
  })

  it('matches Java tower pacing (~1.0s cooldown)', () => {
    const ms = arrowFlightMs(160, 1.0)
    expect(ms).toBeGreaterThanOrEqual(380)
    expect(ms).toBeLessThanOrEqual(950)
  })

  it('scales up for longer shots', () => {
    expect(arrowFlightMs(400, 1.0)).toBeGreaterThan(arrowFlightMs(80, 1.0))
  })
})

describe('rocketFlightMs', () => {
  it('scales with lob distance', () => {
    expect(rocketFlightMs(20 * CELL_SIZE)).toBeGreaterThan(rocketFlightMs(5 * CELL_SIZE))
  })
})
