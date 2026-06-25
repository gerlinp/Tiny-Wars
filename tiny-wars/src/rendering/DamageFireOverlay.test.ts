import { describe, it, expect } from 'vitest'
import { damageFireTier, pickDamageFireGridCell } from '@rendering/damageFireLogic'

describe('damageFireTier', () => {
  it('unlocks fires at 75%, 50%, and 25% HP', () => {
    expect(damageFireTier(1)).toBe(0)
    expect(damageFireTier(0.76)).toBe(0)
    expect(damageFireTier(0.75)).toBe(1)
    expect(damageFireTier(0.51)).toBe(1)
    expect(damageFireTier(0.50)).toBe(2)
    expect(damageFireTier(0.26)).toBe(2)
    expect(damageFireTier(0.25)).toBe(3)
    expect(damageFireTier(0)).toBe(3)
  })
})

describe('pickDamageFireGridCell', () => {
  it('prefers an unused row when one is available', () => {
    const cell = pickDamageFireGridCell([{ col: 2, row: 0 }], 6, 2, () => 0)
    expect(cell.row).toBe(1)
  })

  it('places fires on the 6×2 grid', () => {
    const cell = pickDamageFireGridCell([], 6, 2, () => 0.99)
    expect(cell.col).toBeGreaterThanOrEqual(0)
    expect(cell.col).toBeLessThan(6)
    expect(cell.row).toBeGreaterThanOrEqual(0)
    expect(cell.row).toBeLessThan(2)
  })
})
