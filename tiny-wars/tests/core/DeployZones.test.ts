import { describe, it, expect } from 'vitest'
import { Owner } from '@core/types'
import {
  isTroopDeployCell,
  towerLaneFromCol,
  isCellInLane,
  createEmptyEnemyLaneDeploy,
} from '@core/DeploySystem'
import {
  PLAYER_TOWER_COLS,
  PLAYER_DEPLOY_ROW_MIN,
  BOT_DEPLOY_ROW_MAX,
  DEPLOY_LANE_SPLIT_COL,
} from '@data/GameConstants'

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
    expect(isTroopDeployCell(Owner.PLAYER, { x: 11, y: PLAYER_DEPLOY_ROW_MIN }, enemyLaneDeploy)).toBe(true)
    expect(isTroopDeployCell(Owner.PLAYER, { x: 4, y: BOT_DEPLOY_ROW_MAX }, enemyLaneDeploy)).toBe(false)
  })

  it('unlocks enemy left lane for player when bot left princess falls', () => {
    const enemyLaneDeploy = createEmptyEnemyLaneDeploy()
    enemyLaneDeploy[Owner.PLAYER].left = true
    expect(isTroopDeployCell(Owner.PLAYER, { x: 4, y: 5 }, enemyLaneDeploy)).toBe(true)
    expect(isTroopDeployCell(Owner.PLAYER, { x: 19, y: 5 }, enemyLaneDeploy)).toBe(false)
  })

  it('unlocks enemy right lane for player when bot right princess falls', () => {
    const enemyLaneDeploy = createEmptyEnemyLaneDeploy()
    enemyLaneDeploy[Owner.PLAYER].right = true
    expect(isTroopDeployCell(Owner.PLAYER, { x: 19, y: 5 }, enemyLaneDeploy)).toBe(true)
    expect(isTroopDeployCell(Owner.PLAYER, { x: 4, y: 5 }, enemyLaneDeploy)).toBe(false)
  })

  it('unlocks player right lane for bot when player right princess falls', () => {
    const enemyLaneDeploy = createEmptyEnemyLaneDeploy()
    enemyLaneDeploy[Owner.BOT].right = true
    expect(isTroopDeployCell(Owner.BOT, { x: 19, y: 35 }, enemyLaneDeploy)).toBe(true)
    expect(isTroopDeployCell(Owner.BOT, { x: 4, y: 35 }, enemyLaneDeploy)).toBe(false)
  })
})
