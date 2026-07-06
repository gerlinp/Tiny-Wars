import { describe, it, expect } from 'vitest'
import {
  buildClashStyleSpawnZones,
  buildFallbackSpawnZones,
  enemyUnlockOverlayCells,
  hasSpawnZoneMap,
  spawnZoneCellKey,
} from '@data/SpawnZones'
import {
  BOT_DEPLOY_ROW_MIN,
  BOT_DEPLOY_ROW_MAX,
  BOT_POCKET_ROW_MIN,
  PLAYER_DEPLOY_ROW_MIN,
  DEPLOY_LANE_SPLIT_COL,
} from '@data/GameConstants'

describe('SpawnZones layout', () => {
  it('buildFallbackSpawnZones covers full deploy bands per lane', () => {
    const zones = buildFallbackSpawnZones()
    expect(zones[spawnZoneCellKey(4, BOT_DEPLOY_ROW_MAX)]).toBe('left')
    expect(zones[spawnZoneCellKey(13, BOT_DEPLOY_ROW_MAX)]).toBe('right')
    expect(zones[spawnZoneCellKey(9, PLAYER_DEPLOY_ROW_MIN)]).toBe('base')
  })

  it('buildClashStyleSpawnZones unlocks a half-width pocket that stops at the tower row', () => {
    const zones = buildClashStyleSpawnZones()
    expect(zones[spawnZoneCellKey(2, BOT_DEPLOY_ROW_MAX)]).toBe('left')
    expect(zones[spawnZoneCellKey(15, BOT_DEPLOY_ROW_MAX)]).toBe('right')
    // Split column belongs to the right pocket; depth stops at the fallen tower's row
    expect(zones[spawnZoneCellKey(9, BOT_DEPLOY_ROW_MAX)]).toBe('right')
    expect(zones[spawnZoneCellKey(8, BOT_POCKET_ROW_MIN)]).toBe('left')
    expect(zones[spawnZoneCellKey(9, BOT_POCKET_ROW_MIN)]).toBe('right')
    expect(zones[spawnZoneCellKey(8, BOT_POCKET_ROW_MIN - 1)]).toBeUndefined()
    expect(zones[spawnZoneCellKey(8, 0)]).toBeUndefined()
  })

  it('enemyUnlockOverlayCells skips friendly-row left/right paint', () => {
    const zones = buildClashStyleSpawnZones()
    const cells = enemyUnlockOverlayCells(
      zones,
      BOT_DEPLOY_ROW_MIN,
      BOT_DEPLOY_ROW_MAX,
      { left: true, right: true },
    )
    expect(cells.every(c => c.row <= BOT_DEPLOY_ROW_MAX)).toBe(true)
    expect(cells.some(c => c.col < DEPLOY_LANE_SPLIT_COL)).toBe(true)
    expect(cells.some(c => c.col >= DEPLOY_LANE_SPLIT_COL)).toBe(true)
    expect(hasSpawnZoneMap(zones)).toBe(true)
  })
})
