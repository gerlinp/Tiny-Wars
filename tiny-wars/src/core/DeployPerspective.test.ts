import { describe, it, expect } from 'vitest'
import { Owner } from './types'
import {
  LOCAL_OWNER,
  deployOverlayRects,
  enemyDeployRows,
  friendlyDeployRows,
} from './DeployPerspective'
import { BOT_DEPLOY_ROW_MAX, PLAYER_DEPLOY_ROW_MIN } from '@data/GameConstants'

describe('DeployPerspective', () => {
  it('keeps the local owner on the bottom half in vs-bot', () => {
    expect(LOCAL_OWNER).toBe(Owner.PLAYER)
    const friendly = friendlyDeployRows(LOCAL_OWNER)
    expect(friendly.min).toBe(PLAYER_DEPLOY_ROW_MIN)
    const enemy = enemyDeployRows(LOCAL_OWNER)
    expect(enemy.max).toBe(BOT_DEPLOY_ROW_MAX)
  })

  it('places expanded overlays on the enemy half above the friendly zone', () => {
    const rects = deployOverlayRects(Owner.PLAYER, { left: true, right: false })
    const friendly = rects.find(r => r.kind === 'friendly')!
    const expanded = rects.find(r => r.kind === 'expanded')!
    expect(expanded.y).toBeLessThan(friendly.y)
  })
})
