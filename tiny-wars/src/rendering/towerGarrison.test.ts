import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { Owner } from '@core/types'
import {
  clipAnimKey,
  idleSheetKey,
  GARRISON_CANNON_BALL,
  GARRISON_CANNON_SHEETS,
  getGarrisonExtraSheets,
  garrisonCannonIdleKey,
  resolveGarrisonCannonKey,
} from '@data/AssetManifest'
import { CELL_SIZE, BOT_KING_CANNON_ROW, PLAYER_KING_CANNON_ROW } from '@data/GameConstants'
import {
  GARRISON_ARCHER_CARD_ID,
  garrisonArcherIdleAnimKey,
  garrisonArcherSheetKey,
  garrisonArcherShootAnimKey,
  garrisonSlotUnit,
  garrisonSlots,
  kingCannonDeckWorldY,
  kingCannonMapRow,
  kingCannonMuzzlePosition,
} from './towerGarrison'

const PUBLIC = resolve(import.meta.dirname, '../../public')

describe('tower garrison', () => {
  it('king tower centre slot is a cannon', () => {
    const playerSlots = garrisonSlots(true, Owner.PLAYER)
    expect(playerSlots).toHaveLength(3)
    expect(garrisonSlotUnit(playerSlots[0])).toBe('archer')
    expect(garrisonSlotUnit(playerSlots[1])).toBe('cannon')
    expect(garrisonSlotUnit(playerSlots[2])).toBe('archer')
    expect(playerSlots[1].relX).toBeCloseTo(-0.005, 4)
    expect(playerSlots[1].deckRelY).toBeCloseTo(-0.08, 4)
    expect(playerSlots[0].deckRelY).toBeCloseTo(-0.065, 4)

    const botSlots = garrisonSlots(true, Owner.BOT)
    expect(botSlots[1].relX).toBeCloseTo(-0.005, 4)
    expect(botSlots[1].deckRelY).toBeCloseTo(0.08, 4)
    expect(botSlots[0].deckRelY).toBeCloseTo(0.065, 4)
  })

  it('princess tower keeps a single archer', () => {
    const slots = garrisonSlots(false)
    expect(slots).toHaveLength(1)
    expect(garrisonSlotUnit(slots[0])).toBe('archer')
  })

  it('garrison cannon sheets exist on disk', () => {
    for (const sheet of getGarrisonExtraSheets()) {
      expect(existsSync(resolve(PUBLIC, sheet.path)), sheet.path).toBe(true)
    }
  })

  it('cannon idle faces up for player and down for bot', () => {
    expect(garrisonCannonIdleKey(Owner.PLAYER)).toBe(GARRISON_CANNON_SHEETS.up.key)
    expect(garrisonCannonIdleKey(Owner.BOT)).toBe(GARRISON_CANNON_SHEETS.down.key)
  })

  it('resolveGarrisonCannonKey picks directional sheets', () => {
    expect(resolveGarrisonCannonKey(0, 0, 0, -100)).toEqual({
      key: GARRISON_CANNON_SHEETS.up.key,
      flipX: false,
    })
    expect(resolveGarrisonCannonKey(0, 0, 100, 100)).toEqual({
      key: GARRISON_CANNON_SHEETS.downRight.key,
      flipX: false,
    })
    expect(resolveGarrisonCannonKey(0, 0, -100, 0)).toEqual({
      key: GARRISON_CANNON_SHEETS.right.key,
      flipX: true,
    })
  })

  it('tower garrison archers use elite archer assets', () => {
    expect(GARRISON_ARCHER_CARD_ID).toBe('elite_archer')
    expect(garrisonArcherSheetKey(Owner.PLAYER)).toBe(idleSheetKey('elite_archer', Owner.PLAYER))
    expect(garrisonArcherSheetKey(Owner.PLAYER)).not.toBe(idleSheetKey('archer', Owner.PLAYER))
    expect(garrisonArcherIdleAnimKey(Owner.PLAYER)).toBe(clipAnimKey('elite_archer', Owner.PLAYER, 'idle'))
    expect(garrisonArcherShootAnimKey(Owner.PLAYER)).toBe(clipAnimKey('elite_archer', Owner.PLAYER, 'attack'))
  })

  it('king cannon uses map rows 39 player / 5 bot', () => {
    expect(PLAYER_KING_CANNON_ROW).toBe(37)
    expect(BOT_KING_CANNON_ROW).toBe(5)
    expect(kingCannonMapRow(Owner.PLAYER)).toBe(39)
    expect(kingCannonMapRow(Owner.BOT)).toBe(5)
    expect(kingCannonDeckWorldY(Owner.PLAYER)).toBe(39 * CELL_SIZE + CELL_SIZE / 2)
    expect(kingCannonDeckWorldY(Owner.BOT)).toBe(5 * CELL_SIZE + CELL_SIZE / 2)
  })

  it('kingCannonMuzzlePosition uses sprite-relative deck for both sides', () => {
    const towerX = 240
    const renderY = 500
    const playerMuzzle = kingCannonMuzzlePosition(towerX, renderY, Owner.PLAYER)
    expect(playerMuzzle.x).toBeCloseTo(towerX - 0.005 * 160, 0)

    const botMuzzle = kingCannonMuzzlePosition(towerX, renderY, Owner.BOT)
    expect(botMuzzle.y).toBeLessThan(renderY + 0.08 * 160)
    expect(playerMuzzle.y).toBeLessThan(renderY - 0.08 * 160)
  })

  it('king tower shots use Cannon_Ball.png projectile art', () => {
    expect(GARRISON_CANNON_BALL.path).toContain('Cannon/Cannon_Ball.png')
    expect(existsSync(resolve(PUBLIC, GARRISON_CANNON_BALL.path))).toBe(true)
  })
})
