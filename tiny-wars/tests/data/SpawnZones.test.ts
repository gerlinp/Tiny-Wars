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
  PLAYER_DEPLOY_ROW_MIN,
  DEPLOY_LANE_SPLIT_COL,
} from '@data/GameConstants'

describe('SpawnZones layout', () => {
  it('buildFallbackSpawnZones covers full deploy bands per lane', () => {
    const zones = buildFallbackSpawnZones()
    expect(zones[spawnZoneCellKey(4, BOT_DEPLOY_ROW_MAX)]).toBe('left')
    expect(zones[spawnZoneCellKey(19, BOT_DEPLOY_ROW_MAX)]).toBe('right')
    expect(zones[spawnZoneCellKey(11, PLAYER_DEPLOY_ROW_MIN)]).toBe('base')
  })

  it('buildClashStyleSpawnZones keeps enemy center corridor off lane unlock paint', () => {
    const zones = buildClashStyleSpawnZones()
    expect(zones[spawnZoneCellKey(4, 13)]).toBe('left')
    expect(zones[spawnZoneCellKey(19, 13)]).toBe('right')
    expect(zones[spawnZoneCellKey(11, 13)]).toBe('base')
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
