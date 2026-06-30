import { COMPOSITE_LAYER_OFFSETS, type CompositeLayerOffset } from '@data/CompositeLayerOffsets'
import { PIRATE_TOWER_FRAME } from '@data/AssetManifest'
import {
  MAP_HEIGHT_MULTIPLIER,
  MAP_UNIT_TARGET_HEIGHT,
  SPRITE_VISUAL_SCALE,
} from '@data/GameConstants'
import { BOMB_TOWER_BOMBER_FEET_Y, BOMB_TOWER_DECK_Y_FRAC } from '@rendering/towerGarrison'
import { containAvatarScale } from '@ui/cardAvatarFit'

const WOOD_TOWER_CONTENT_FILL = 0.72
const BOMB_FISH_CONTENT_FILL = 0.55

export interface BombTowerCompositeRect {
  x: number
  y: number
  width: number
  height: number
}

export interface BombTowerCompositeLayout {
  platform: BombTowerCompositeRect
  bomber: BombTowerCompositeRect
}

/** On-map display sizes — mirrors map-editor {@link unitDisplayHGame}. */
export function bombTowerGameDisplaySizes(): {
  platformW: number
  platformH: number
  bomberW: number
  bomberH: number
} {
  const platformH =
    MAP_UNIT_TARGET_HEIGHT * MAP_HEIGHT_MULTIPLIER.building / WOOD_TOWER_CONTENT_FILL * SPRITE_VISUAL_SCALE
  const platformW = platformH * (PIRATE_TOWER_FRAME.width / PIRATE_TOWER_FRAME.height)
  const bomberH = MAP_UNIT_TARGET_HEIGHT / BOMB_FISH_CONTENT_FILL * SPRITE_VISUAL_SCALE
  const bomberW = bomberH
  return { platformW, platformH, bomberW, bomberH }
}

/**
 * Composite layer rects in game pixels — mirrors map-editor
 * {@link getWoodTowerLayerLayouts} (platform origin at base anchor).
 */
export function layoutBombTowerComposite(
  baseX: number,
  baseY: number,
  offsets: Readonly<Record<string, CompositeLayerOffset>> = COMPOSITE_LAYER_OFFSETS.wood_tower!,
): BombTowerCompositeLayout {
  const { platformW, platformH, bomberW, bomberH } = bombTowerGameDisplaySizes()

  const platX = baseX - platformW / 2 + offsets.platform.x
  const platY = baseY - platformH + offsets.platform.y

  const deckY = baseY - platformH * BOMB_TOWER_DECK_Y_FRAC
  const bomberX = baseX - bomberW / 2 + offsets.bomber.x
  const bomberY = deckY - BOMB_TOWER_BOMBER_FEET_Y * bomberH + offsets.bomber.y

  return {
    platform: { x: platX, y: platY, width: platformW, height: platformH },
    bomber: { x: bomberX, y: bomberY, width: bomberW, height: bomberH },
  }
}

/** Layout in slot pixels (origin top-left) — platform fill-scales like other building cards. */
export function fitBombTowerCompositeInSlot(
  slotW: number,
  slotH: number,
  handScale = 1,
): { fit: number; layers: BombTowerCompositeLayout } {
  const game = bombTowerGameDisplaySizes()
  const fit = containAvatarScale(game.platformW, game.platformH, slotW, slotH) * 0.94 * handScale
  const offsets = COMPOSITE_LAYER_OFFSETS.wood_tower!

  const platformW = game.platformW * fit
  const platformH = game.platformH * fit
  const bomberW = game.bomberW * fit
  const bomberH = game.bomberH * fit

  const baseX = slotW / 2
  const baseY = slotH * 0.72

  const platX = baseX - platformW / 2 + offsets.platform.x * fit
  const platY = baseY - platformH + offsets.platform.y * fit
  const deckY = baseY - platformH * BOMB_TOWER_DECK_Y_FRAC
  const bomberX = baseX - bomberW / 2 + offsets.bomber.x * fit
  const bomberY = deckY - BOMB_TOWER_BOMBER_FEET_Y * bomberH + offsets.bomber.y * fit

  return {
    fit,
    layers: {
      platform: { x: platX, y: platY, width: platformW, height: platformH },
      bomber: { x: bomberX, y: bomberY, width: bomberW, height: bomberH },
    },
  }
}
