import {
  MAP_TOWER_RENDER_OFFSET_Y_BOT,
  MAP_TOWER_RENDER_OFFSET_Y_PLAYER,
} from '@data/GameConstants'
import { Owner } from '@core/types'

/** Logic Y → on-screen Y for tower/castle sprites. */
export function towerRenderY(logicY: number, owner: Owner): number {
  const offset = owner === Owner.PLAYER
    ? MAP_TOWER_RENDER_OFFSET_Y_PLAYER
    : MAP_TOWER_RENDER_OFFSET_Y_BOT
  return logicY + offset
}
