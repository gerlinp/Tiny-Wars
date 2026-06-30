import { COMPOSITE_LAYER_OFFSETS, type CompositeLayerOffset } from '@data/CompositeLayerOffsets'
import { PIRATE_TOWER_FRAME } from '@data/AssetManifest'
import {
  MAP_UNIT_TARGET_HEIGHT,
  SPRITE_VISUAL_SCALE,
  CELL_SIZE,
} from '@data/GameConstants'
import { logicDisplayHeightForCard } from '@rendering/assetDisplaySize'
import { BOMB_TOWER_BOMBER_FEET_Y, BOMB_TOWER_DECK_Y_FRAC } from '@rendering/towerGarrison'

/**
 * Anchor-relative layer positions for composite card-hand portraits.
 * Not shown in the unit editor — tune on-map layer offsets there, then use
 * {@link resolveCompositeAvatarLayout} + {@link layoutCompositeInSlot} when wiring avatars.
 */

/** Sprite origin position in game pixels from the unit logic anchor (+Y = down). */
export interface CompositeLayerPlacement {
  x: number
  y: number
  originX: number
  originY: number
}

export interface CompositeUnitAvatarLayout {
  /** Where the unit anchor sits inside the card-hand slot (0–1). */
  slotAnchor: { x: number; y: number }
  layers: Record<string, CompositeLayerPlacement>
}

const BOMB_FISH_CONTENT_FILL = 0.55
const AIR_BOAT_SPRITE_ORIGIN_Y = 0.25
const AIR_BOAT_FRAME_SHARK_Y = 0.65
const AIR_BOAT_SHARK_STERN_X_RATIO = 0.13

function woodTowerPlatformH(): number {
  return logicDisplayHeightForCard('wood_tower')
}

function bombFishDisplayH(): number {
  return MAP_UNIT_TARGET_HEIGHT / BOMB_FISH_CONTENT_FILL * SPRITE_VISUAL_SCALE
}

function airBoatDisplayH(): number {
  return MAP_UNIT_TARGET_HEIGHT / 0.42 * SPRITE_VISUAL_SCALE
}

/** Default anchor-relative layout before editor nudges (offsets applied in {@link resolveCompositeAvatarLayout}). */
/** Extra downscale for composite card-hand portraits (1 = slot fit only). */
export const COMPOSITE_AVATAR_SLOT_SCALE: Readonly<Partial<Record<string, number>>> = {
  wood_tower: 1.05,
}

/** Default avatar frame position on unit editor canvas (px). */
export const COMPOSITE_AVATAR_FRAME_POS_DEFAULTS: Readonly<
  Partial<Record<string, Readonly<{ x: number; y: number }>>>
> = {
  wood_tower: { x: 430, y: 490 },
}

export const COMPOSITE_AVATAR_LAYOUT_DEFAULTS: Readonly<Record<string, CompositeUnitAvatarLayout>> = {
  wood_tower: {
    slotAnchor: { x: 0.5, y: 0.72 },
    layers: {
      platform: { x: 0, y: 0, originX: 0.5, originY: 1 },
      bomber: {
        x: 0,
        y: -woodTowerPlatformH() * BOMB_TOWER_DECK_Y_FRAC,
        originX: 0.5,
        originY: BOMB_TOWER_BOMBER_FEET_Y,
      },
    },
  },
  air_boat: {
    slotAnchor: { x: 0.5, y: 0.55 },
    layers: {
      hull: { x: 0, y: 0, originX: 0.5, originY: AIR_BOAT_SPRITE_ORIGIN_Y },
      crew: {
        x: -airBoatDisplayH() * (256 / 256) * AIR_BOAT_SHARK_STERN_X_RATIO,
        y: airBoatDisplayH() * (AIR_BOAT_FRAME_SHARK_Y - AIR_BOAT_SPRITE_ORIGIN_Y),
        originX: 0.5,
        originY: 0.5,
      },
    },
  },
}

/** Layer drag offsets → anchor-relative placement for avatar / export. */
export function compositePlacementFromOffset(
  unitId: string,
  layerId: string,
  offset: CompositeLayerOffset,
): CompositeLayerPlacement {
  const base = COMPOSITE_AVATAR_LAYOUT_DEFAULTS[unitId]?.layers[layerId]
  if (!base) {
    return { x: offset.x, y: offset.y, originX: 0.5, originY: 0.5 }
  }

  if (unitId === 'wood_tower' && layerId === 'bomber') {
    return {
      ...base,
      x: offset.x,
      y: -woodTowerPlatformH() * BOMB_TOWER_DECK_Y_FRAC + offset.y,
    }
  }

  if (unitId === 'air_boat' && layerId === 'crew') {
    const hullH = airBoatDisplayH()
    const sternX = -hullH * AIR_BOAT_SHARK_STERN_X_RATIO
    const crewY = hullH * (AIR_BOAT_FRAME_SHARK_Y - AIR_BOAT_SPRITE_ORIGIN_Y)
    return { ...base, x: sternX + offset.x, y: crewY + offset.y }
  }

  return { x: base.x + offset.x, y: base.y + offset.y, originX: base.originX, originY: base.originY }
}

export function compositeOffsetFromPlacement(
  unitId: string,
  layerId: string,
  placement: Pick<CompositeLayerPlacement, 'x' | 'y'>,
): CompositeLayerOffset {
  const base = COMPOSITE_AVATAR_LAYOUT_DEFAULTS[unitId]?.layers[layerId]
  if (!base) return { x: placement.x, y: placement.y }

  if (unitId === 'wood_tower' && layerId === 'bomber') {
    return {
      x: placement.x,
      y: placement.y + woodTowerPlatformH() * BOMB_TOWER_DECK_Y_FRAC,
    }
  }

  if (unitId === 'air_boat' && layerId === 'crew') {
    const hullH = airBoatDisplayH()
    const sternX = -hullH * AIR_BOAT_SHARK_STERN_X_RATIO
    const crewY = hullH * (AIR_BOAT_FRAME_SHARK_Y - AIR_BOAT_SPRITE_ORIGIN_Y)
    return { x: placement.x - sternX, y: placement.y - crewY }
  }

  return { x: placement.x - base.x, y: placement.y - base.y }
}

/** Resolved layout: defaults + live {@link COMPOSITE_LAYER_OFFSETS}. */
export function resolveCompositeAvatarLayout(unitId: string): CompositeUnitAvatarLayout | null {
  const defaults = COMPOSITE_AVATAR_LAYOUT_DEFAULTS[unitId]
  const offsets = COMPOSITE_LAYER_OFFSETS[unitId]
  if (!defaults || !offsets) return null

  const layers: Record<string, CompositeLayerPlacement> = {}
  for (const layerId of Object.keys(defaults.layers)) {
    layers[layerId] = compositePlacementFromOffset(unitId, layerId, offsets[layerId] ?? { x: 0, y: 0 })
  }
  return { slotAnchor: { ...defaults.slotAnchor }, layers }
}

export function compositeLayerDisplaySize(
  unitId: string,
  layerId: string,
): { width: number; height: number } {
  if (unitId === 'wood_tower') {
    const platformH = woodTowerPlatformH()
    if (layerId === 'platform') {
      return {
        width: platformH * (PIRATE_TOWER_FRAME.width / PIRATE_TOWER_FRAME.height),
        height: platformH,
      }
    }
    const h = bombFishDisplayH()
    return { width: h, height: h }
  }
  if (unitId === 'air_boat') {
    const hullH = airBoatDisplayH()
    if (layerId === 'hull') return { width: hullH, height: hullH }
    const crewH = bombFishDisplayH()
    return { width: crewH, height: crewH }
  }
  return { width: CELL_SIZE, height: CELL_SIZE }
}
