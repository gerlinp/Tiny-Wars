import { describe, it, expect } from 'vitest'
import { nearestBridgeColumn } from '@core/entities/Troop'
import { LEFT_BRIDGE_COLS, RIGHT_BRIDGE_COLS } from '@data/GameConstants'

describe('Bridge funneling', () => {
  it('crosses on the band column nearest the unit (spreads across bridge width)', () => {
    for (const col of LEFT_BRIDGE_COLS) {
      expect(nearestBridgeColumn(col, LEFT_BRIDGE_COLS)).toBe(col)
    }
    for (const col of RIGHT_BRIDGE_COLS) {
      expect(nearestBridgeColumn(col, RIGHT_BRIDGE_COLS)).toBe(col)
    }
  })

  it('assigns different bridge columns to units approaching at different x', () => {
    const leftEdge = nearestBridgeColumn(LEFT_BRIDGE_COLS[0]!, LEFT_BRIDGE_COLS)
    const rightEdge = nearestBridgeColumn(LEFT_BRIDGE_COLS[LEFT_BRIDGE_COLS.length - 1]!, LEFT_BRIDGE_COLS)
    expect(leftEdge).not.toBe(rightEdge)
  })

  it('clamps a unit outside the band to the nearest edge column', () => {
    expect(nearestBridgeColumn(-10, LEFT_BRIDGE_COLS)).toBe(Math.min(...LEFT_BRIDGE_COLS))
    expect(nearestBridgeColumn(999, RIGHT_BRIDGE_COLS)).toBe(Math.max(...RIGHT_BRIDGE_COLS))
  })
})
