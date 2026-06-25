import { Owner } from './types'
import type { GameState } from './GameState'
import type { LaneUnlocks } from './DeployZones'
import {
  CELL_SIZE,
  GAME_WIDTH,
  PLAYER_DEPLOY_ROW_MIN,
  PLAYER_DEPLOY_ROW_MAX,
  BOT_DEPLOY_ROW_MIN,
  BOT_DEPLOY_ROW_MAX,
  DEPLOY_LANE_SPLIT_COL,
} from '@data/GameConstants'

/**
 * Local human seat for UI/rendering. Vs-bot and online clients always treat
 * themselves as the bottom-side owner (Clash-style). Authoritative sim still
 * uses Owner.PLAYER / Owner.BOT grid rows.
 */
export const LOCAL_OWNER = Owner.PLAYER

export function opponentOf(owner: Owner): Owner {
  return owner === Owner.PLAYER ? Owner.BOT : Owner.PLAYER
}

export function friendlyDeployRows(owner: Owner): { min: number; max: number } {
  return owner === Owner.PLAYER
    ? { min: PLAYER_DEPLOY_ROW_MIN, max: PLAYER_DEPLOY_ROW_MAX }
    : { min: BOT_DEPLOY_ROW_MIN, max: BOT_DEPLOY_ROW_MAX }
}

export function enemyDeployRows(owner: Owner): { min: number; max: number } {
  return owner === Owner.PLAYER
    ? { min: BOT_DEPLOY_ROW_MIN, max: BOT_DEPLOY_ROW_MAX }
    : { min: PLAYER_DEPLOY_ROW_MIN, max: PLAYER_DEPLOY_ROW_MAX }
}

export function enemyLaneUnlocksFor(state: GameState, owner: Owner): LaneUnlocks {
  return state.enemyLaneDeploy[owner]
}

export interface DeployOverlayRect {
  x: number
  y: number
  w: number
  h: number
  kind: 'friendly' | 'expanded'
}

/** Highlight rectangles from the local player's POV (friendly = bottom). */
export function deployOverlayRects(localOwner: Owner, unlocks: LaneUnlocks): DeployOverlayRect[] {
  const friendly = friendlyDeployRows(localOwner)
  const enemy = enemyDeployRows(localOwner)

  const rects: DeployOverlayRect[] = [{
    x: 0,
    y: friendly.min * CELL_SIZE,
    w: GAME_WIDTH,
    h: (friendly.max - friendly.min + 1) * CELL_SIZE,
    kind: 'friendly',
  }]

  const enemyY = enemy.min * CELL_SIZE
  const enemyH = (enemy.max - enemy.min + 1) * CELL_SIZE

  if (unlocks.left) {
    rects.push({
      x: 0,
      y: enemyY,
      w: DEPLOY_LANE_SPLIT_COL * CELL_SIZE,
      h: enemyH,
      kind: 'expanded',
    })
  }

  if (unlocks.right) {
    rects.push({
      x: DEPLOY_LANE_SPLIT_COL * CELL_SIZE,
      y: enemyY,
      w: GAME_WIDTH - DEPLOY_LANE_SPLIT_COL * CELL_SIZE,
      h: enemyH,
      kind: 'expanded',
    })
  }

  return rects
}
