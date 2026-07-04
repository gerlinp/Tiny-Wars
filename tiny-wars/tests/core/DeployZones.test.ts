import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Owner } from '@core/types'
import {
  isTroopDeployCell,
  towerLaneFromCol,
  isCellInLane,
  createEmptyEnemyLaneDeploy,
  deployOverlayRects,
} from '@core/DeploySystem'
import {
  PLAYER_TOWER_COLS,
  PLAYER_DEPLOY_ROW_MIN,
  BOT_DEPLOY_ROW_MAX,
  BOT_DEPLOY_ROW_MIN,
  DEPLOY_LANE_SPLIT_COL,
  CELL_SIZE,
} from '@data/GameConstants'
import { setActiveMapConfig, getActiveMapConfig } from '@data/ActiveMapConfig'
import { DEFAULT_MAP_CONFIG } from '@data/DefaultMapConfig'
import type { SpawnZoneMap } from '@data/SpawnZones'
import {
  enemyUnlockOverlayCells,
  isPaintedEnemyUnlockCell,
  spawnZoneAt,
} from '@data/SpawnZones'

const PAINTED_SPAWN_ZONES: SpawnZoneMap = {
  '4,5': 'left',
  '13,5': 'right',
  '9,5': 'base',
  '4,28': 'left',
  '8,28': 'base',
}

describe('DeployZones', () => {
  it('maps princess tower columns to left/right lanes', () => {
    expect(towerLaneFromCol(PLAYER_TOWER_COLS[0])).toBe('left')
    expect(towerLaneFromCol(PLAYER_TOWER_COLS[1])).toBe('right')
  })

  it('splits columns at the lane divider', () => {
    expect(isCellInLane(DEPLOY_LANE_SPLIT_COL - 1, 'left')).toBe(true)
    expect(isCellInLane(DEPLOY_LANE_SPLIT_COL, 'right')).toBe(true)
    expect(isCellInLane(DEPLOY_LANE_SPLIT_COL, 'left')).toBe(false)
  })

  it('allows player base deploy only before any tower falls', () => {
    const enemyLaneDeploy = createEmptyEnemyLaneDeploy()
    expect(isTroopDeployCell(Owner.PLAYER, { x: 9, y: PLAYER_DEPLOY_ROW_MIN }, enemyLaneDeploy)).toBe(true)
    expect(isTroopDeployCell(Owner.PLAYER, { x: 4, y: BOT_DEPLOY_ROW_MAX }, enemyLaneDeploy)).toBe(false)
  })

  it('unlocks enemy left lane for player when bot left princess falls', () => {
    const enemyLaneDeploy = createEmptyEnemyLaneDeploy()
    enemyLaneDeploy[Owner.PLAYER].left = true
    expect(isTroopDeployCell(Owner.PLAYER, { x: 4, y: 5 }, enemyLaneDeploy)).toBe(true)
    expect(isTroopDeployCell(Owner.PLAYER, { x: 13, y: 5 }, enemyLaneDeploy)).toBe(false)
  })

  it('unlocks enemy right lane for player when bot right princess falls', () => {
    const enemyLaneDeploy = createEmptyEnemyLaneDeploy()
    enemyLaneDeploy[Owner.PLAYER].right = true
    expect(isTroopDeployCell(Owner.PLAYER, { x: 13, y: 5 }, enemyLaneDeploy)).toBe(true)
    expect(isTroopDeployCell(Owner.PLAYER, { x: 4, y: 5 }, enemyLaneDeploy)).toBe(false)
  })

  it('unlocks player right lane for bot when player right princess falls', () => {
    const enemyLaneDeploy = createEmptyEnemyLaneDeploy()
    enemyLaneDeploy[Owner.BOT].right = true
    expect(isTroopDeployCell(Owner.BOT, { x: 13, y: 28 }, enemyLaneDeploy)).toBe(true)
    expect(isTroopDeployCell(Owner.BOT, { x: 4, y: 28 }, enemyLaneDeploy)).toBe(false)
  })
})

describe('painted spawnZones', () => {
  const prev = getActiveMapConfig()

  beforeEach(() => {
    setActiveMapConfig({ ...DEFAULT_MAP_CONFIG, spawnZones: PAINTED_SPAWN_ZONES })
  })

  afterEach(() => {
    setActiveMapConfig(prev ?? DEFAULT_MAP_CONFIG)
  })

  it('allows full friendly half regardless of painted zones', () => {
    const enemyLaneDeploy = createEmptyEnemyLaneDeploy()
    expect(isTroopDeployCell(Owner.PLAYER, { x: 10, y: PLAYER_DEPLOY_ROW_MIN }, enemyLaneDeploy)).toBe(true)
    expect(isTroopDeployCell(Owner.PLAYER, { x: 4, y: 28 }, enemyLaneDeploy)).toBe(true)
  })

  it('only unlocks painted left cells on enemy half when left tower falls', () => {
    const enemyLaneDeploy = createEmptyEnemyLaneDeploy()
    enemyLaneDeploy[Owner.PLAYER].left = true
    expect(isTroopDeployCell(Owner.PLAYER, { x: 4, y: 5 }, enemyLaneDeploy)).toBe(true)
    expect(isTroopDeployCell(Owner.PLAYER, { x: 9, y: 5 }, enemyLaneDeploy)).toBe(false)
    expect(isTroopDeployCell(Owner.PLAYER, { x: 13, y: 5 }, enemyLaneDeploy)).toBe(false)
  })

  it('only unlocks painted right cells on enemy half when right tower falls', () => {
    const enemyLaneDeploy = createEmptyEnemyLaneDeploy()
    enemyLaneDeploy[Owner.PLAYER].right = true
    expect(isTroopDeployCell(Owner.PLAYER, { x: 13, y: 5 }, enemyLaneDeploy)).toBe(true)
    expect(isTroopDeployCell(Owner.PLAYER, { x: 9, y: 5 }, enemyLaneDeploy)).toBe(false)
  })

  it('ignores left/right paint on friendly rows for enemy unlock checks', () => {
    expect(isPaintedEnemyUnlockCell(
      PAINTED_SPAWN_ZONES, 4, 28, 'left', BOT_DEPLOY_ROW_MIN, BOT_DEPLOY_ROW_MAX,
    )).toBe(false)
    expect(spawnZoneAt(PAINTED_SPAWN_ZONES, 4, 28)).toBe('left')
  })

  it('builds per-cell overlay rects from painted enemy unlock cells', () => {
    const cells = enemyUnlockOverlayCells(
      PAINTED_SPAWN_ZONES,
      BOT_DEPLOY_ROW_MIN,
      BOT_DEPLOY_ROW_MAX,
      { left: true, right: false },
    )
    expect(cells).toEqual([{ col: 4, row: 5 }])

    const rects = deployOverlayRects(Owner.PLAYER, { left: true, right: false }, PAINTED_SPAWN_ZONES)
    const expanded = rects.filter(r => r.kind === 'expanded')
    expect(expanded).toHaveLength(1)
    expect(expanded[0]).toMatchObject({
      x: 4 * CELL_SIZE,
      y: 5 * CELL_SIZE,
      w: CELL_SIZE,
      h: CELL_SIZE,
    })
  })
})
