import {
  COMPOSITE_AVATAR_SLOT_SCALE,
  compositeLayerDisplaySize,
  resolveCompositeAvatarLayout,
  type CompositeLayerPlacement,
} from '@data/CompositeAvatarLayout'
import { containAvatarScale } from '@ui/cardAvatarFit'

export interface CompositeSlotRect {
  x: number
  y: number
  width: number
  height: number
  originX: number
  originY: number
}

export interface CompositeSlotLayout {
  fit: number
  anchorX: number
  anchorY: number
  layers: Record<string, CompositeSlotRect>
}

/** Lay out composite card art in slot pixels using anchor-relative game coordinates. */
export function layoutCompositeInSlot(
  unitId: string,
  slotW: number,
  slotH: number,
  handScale = 1,
): CompositeSlotLayout | null {
  const layout = resolveCompositeAvatarLayout(unitId)
  if (!layout) return null

  const layerIds = Object.keys(layout.layers)
  let refW = 0
  let refH = 0
  for (const layerId of layerIds) {
    const size = compositeLayerDisplaySize(unitId, layerId)
    refW = Math.max(refW, size.width)
    refH = Math.max(refH, size.height)
  }

  const slotScale = COMPOSITE_AVATAR_SLOT_SCALE[unitId] ?? 1
  const fit = containAvatarScale(refW, refH, slotW, slotH) * 0.94 * handScale * slotScale
  const anchorX = slotW * layout.slotAnchor.x
  const anchorY = slotH * layout.slotAnchor.y

  const layers: Record<string, CompositeSlotRect> = {}
  for (const layerId of layerIds) {
    const placement = layout.layers[layerId]!
    layers[layerId] = placementToSlotRect(placement, unitId, layerId, fit, anchorX, anchorY)
  }

  return { fit, anchorX, anchorY, layers }
}

function placementToSlotRect(
  placement: CompositeLayerPlacement,
  unitId: string,
  layerId: string,
  fit: number,
  anchorX: number,
  anchorY: number,
): CompositeSlotRect {
  const size = compositeLayerDisplaySize(unitId, layerId)
  return {
    x: anchorX + placement.x * fit,
    y: anchorY + placement.y * fit,
    width: size.width * fit,
    height: size.height * fit,
    originX: placement.originX,
    originY: placement.originY,
  }
}
