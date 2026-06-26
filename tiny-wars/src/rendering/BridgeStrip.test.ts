import { describe, it, expect } from 'vitest'
import { CELL_SIZE } from '@data/GameConstants'
import { bridgeSliceHeights } from '@data/TerrainManifest'

describe('bridgeSliceHeights', () => {
  it('stretches mid section to fill span after proportional caps', () => {
    const bridgeW = 2 * CELL_SIZE
    const totalH = 100
    const { topH, midH, bottomH } = bridgeSliceHeights(totalH, bridgeW)

    expect(topH).toBeGreaterThan(0)
    expect(bottomH).toBeGreaterThan(0)
    expect(midH).toBeGreaterThan(0)
    expect(topH + midH + bottomH).toBe(totalH)
  })
})
