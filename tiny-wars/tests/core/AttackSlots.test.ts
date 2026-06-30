import { describe, it, expect } from 'vitest'
import { assignSlotIndex, attackSlotPosition, attackSlotPositionFromLayout, slotBaseAngle } from '@core/AttackSlots'
import { CELL_SIZE, BOT_KING_ROW, PLAYER_KING_ROW, BOT_TOWER_ROW } from '@data/GameConstants'
import { BOT_KING_TOWER_MELEE, PLAYER_KING_TOWER_MELEE } from '@data/KingTowerMeleeLayout'
import { BOT_PRINCESS_TOWER_MELEE, PLAYER_PRINCESS_TOWER_MELEE } from '@data/PrincessTowerMeleeLayout'
import { bombTowerMeleeLayout } from '@data/BombTowerMeleeLayout'
import { Owner } from '@core/types'
import { towerSlotOriginCenter } from '@rendering/towerRenderPosition'

describe('AttackSlots', () => {
  it('assigns deterministic slot indices from sorted ids', () => {
    expect(assignSlotIndex('b', ['c', 'a', 'b'])).toEqual({ index: 1, total: 3 })
    expect(assignSlotIndex('a', ['c', 'a', 'b'])).toEqual({ index: 0, total: 3 })

    // Every attacker agrees on the ordering, so each gets a distinct index.
    const ids = ['t3', 't1', 't2']
    const indices = ids.map((id) => assignSlotIndex(id, ids).index).sort()
    expect(indices).toEqual([0, 1, 2])
  })

  it('falls back to a single slot when the id is missing or list empty', () => {
    expect(assignSlotIndex('x', [])).toEqual({ index: 0, total: 1 })
    expect(assignSlotIndex('x', ['a', 'b'])).toEqual({ index: 0, total: 2 })
  })

  it('places attackers on a ring around the target at the standoff radius', () => {
    const center = { x: 100, y: 100 }
    const targetR = 20
    const attackerR = 5
    const rangePx = 10
    const total = 4
    const positions = [0, 1, 2, 3].map((i) =>
      attackSlotPosition(center, targetR, attackerR, rangePx, i, total, 0),
    )

    const expectedRadius = targetR + attackerR + rangePx
    for (const p of positions) {
      expect(Math.hypot(p.x - center.x, p.y - center.y)).toBeCloseTo(expectedRadius, 5)
    }

    const unique = new Set(positions.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`))
    expect(unique.size).toBe(total)
  })

  it('subtracts slack from the ring radius', () => {
    const p = attackSlotPosition({ x: 0, y: 0 }, 20, 5, 10, 0, 1, 0, 8)
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(20 + 5 + 10 - 8, 5)
  })

  it('faces the first slot toward the attacker via baseAngle', () => {
    const center = { x: 0, y: 0 }
    const attacker = { x: 50, y: 0 } // directly to the right of the target
    const angle = slotBaseAngle(attacker, center)
    expect(angle).toBeCloseTo(0, 5)

    const first = attackSlotPosition(center, 10, 2, 0, 0, 4, angle)
    expect(first.x).toBeGreaterThan(0)
    expect(first.y).toBeCloseTo(0, 5)
  })

  it('maps custom layout slots from a tower origin in cells', () => {
    const origin = { x: 100, y: 200 }
    const p0 = attackSlotPositionFromLayout(origin, 0, BOT_PRINCESS_TOWER_MELEE.slotPositions)
    expect(p0.x).toBeCloseTo(100, 5)
    expect(p0.y).toBeCloseTo(200 + 2.9 * CELL_SIZE, 5)
    const p1 = attackSlotPositionFromLayout(origin, 1, BOT_PRINCESS_TOWER_MELEE.slotPositions)
    expect(p1.y).toBeCloseTo(200 - 2.9 * CELL_SIZE, 5)
  })

  it('offsets bot princess slot origin below the logic anchor', () => {
    const logicY = BOT_TOWER_ROW * CELL_SIZE + CELL_SIZE / 2
    const logicX = 4 * CELL_SIZE + CELL_SIZE / 2
    const origin = towerSlotOriginCenter(logicX, logicY, Owner.BOT, false)
    expect(origin.y).toBeCloseTo(logicY + BOT_PRINCESS_TOWER_MELEE.slotOriginOffsetCells.y * CELL_SIZE, 5)
  })

  it('offsets player princess slot origin above the logic anchor', () => {
    const logicY = 31 * CELL_SIZE + CELL_SIZE / 2
    const logicX = 4 * CELL_SIZE + CELL_SIZE / 2
    const origin = towerSlotOriginCenter(logicX, logicY, Owner.PLAYER, false)
    expect(origin.y).toBeCloseTo(logicY + PLAYER_PRINCESS_TOWER_MELEE.slotOriginOffsetCells.y * CELL_SIZE, 5)
    const p0 = attackSlotPositionFromLayout(origin, 0, PLAYER_PRINCESS_TOWER_MELEE.slotPositions)
    expect(p0.y).toBeCloseTo(origin.y - 2.9 * CELL_SIZE, 5)
  })

  it('bomb tower uses editor-tuned dense slot ring (18 positions)', () => {
    const layout = bombTowerMeleeLayout()
    expect(layout.slotPositions).toHaveLength(18)
    expect(layout.slotPositions).toEqual(PLAYER_PRINCESS_TOWER_MELEE.slotPositions)
  })

  it('offsets bot king slot origin from logic anchor', () => {
    const logicY = BOT_KING_ROW * CELL_SIZE + CELL_SIZE / 2
    const logicX = 11.5 * CELL_SIZE + CELL_SIZE / 2
    const origin = towerSlotOriginCenter(logicX, logicY, Owner.BOT, true)
    expect(origin.x).toBeCloseTo(logicX + BOT_KING_TOWER_MELEE.slotOriginOffsetCells.x * CELL_SIZE, 5)
    expect(origin.y).toBeCloseTo(logicY + BOT_KING_TOWER_MELEE.slotOriginOffsetCells.y * CELL_SIZE, 5)
    const p0 = attackSlotPositionFromLayout(origin, 0, BOT_KING_TOWER_MELEE.slotPositions)
    expect(p0.y).toBeCloseTo(origin.y + 3.45 * CELL_SIZE, 5)
  })

  it('offsets player king slot origin from logic anchor', () => {
    const logicY = PLAYER_KING_ROW * CELL_SIZE + CELL_SIZE / 2
    const logicX = 11.5 * CELL_SIZE + CELL_SIZE / 2
    const origin = towerSlotOriginCenter(logicX, logicY, Owner.PLAYER, true)
    expect(origin.x).toBeCloseTo(logicX + PLAYER_KING_TOWER_MELEE.slotOriginOffsetCells.x * CELL_SIZE, 5)
    expect(origin.y).toBeCloseTo(logicY + PLAYER_KING_TOWER_MELEE.slotOriginOffsetCells.y * CELL_SIZE, 5)
    const p0 = attackSlotPositionFromLayout(origin, 0, PLAYER_KING_TOWER_MELEE.slotPositions)
    expect(p0.y).toBeCloseTo(origin.y - 3.45 * CELL_SIZE, 5)
  })

  it('king tower has 30 melee slots per side', () => {
    expect(PLAYER_KING_TOWER_MELEE.slotPositions).toHaveLength(30)
    expect(BOT_KING_TOWER_MELEE.slotPositions).toHaveLength(30)
  })
})
