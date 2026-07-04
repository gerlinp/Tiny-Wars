import { describe, expect, it } from 'vitest'
import {
  COMPOSITE_AVATAR_SLOT_SCALE,
  compositeLayerDisplaySize,
  compositePlacementFromOffset,
  resolveCompositeAvatarLayout,
} from '@data/CompositeAvatarLayout'
import { layoutCompositeInSlot } from '@rendering/compositeAvatarLayout'
import { BOMB_TOWER_BOMBER_FEET_Y, BOMB_TOWER_DECK_Y_FRAC } from '@rendering/towerGarrison'

describe('CompositeAvatarLayout (wood_tower)', () => {
  it('matches map-editor troop vs building height ratio', () => {
    const platform = compositeLayerDisplaySize('wood_tower', 'platform')
    const bomber = compositeLayerDisplaySize('wood_tower', 'bomber')
    expect(bomber.height / platform.height).toBeCloseTo(0.684, 2)
  })

  it('maps editor bomber offset into slot space', () => {
    const layout = resolveCompositeAvatarLayout('wood_tower')
    expect(layout).not.toBeNull()
    const slot = layoutCompositeInSlot('wood_tower', 243, 272, 0.92)
    expect(slot).not.toBeNull()

    const bomber = slot!.layers.bomber!
    expect(bomber.originY).toBe(BOMB_TOWER_BOMBER_FEET_Y)
    expect(bomber.x).toBeCloseTo(slot!.anchorX + layout!.layers.bomber!.x * slot!.fit, 0)
    expect(bomber.y).toBeCloseTo(slot!.anchorY + layout!.layers.bomber!.y * slot!.fit, 0)
  })

  it('applies editor composite offsets in resolved layout', () => {
    const layout = resolveCompositeAvatarLayout('wood_tower')
    expect(layout!.layers.platform!.x).toBe(1)
    expect(layout!.layers.platform!.y).toBe(143)
    expect(layout!.layers.bomber!.x).toBe(2)
    expect(layout!.layers.bomber!.y).toBeCloseTo(15.6, 0)
  })

  it('uses editor avatar preview scale from unit export', () => {
    expect(COMPOSITE_AVATAR_SLOT_SCALE.wood_tower).toBe(1.05)
  })

  it('scales the platform to fill most of the card slot width', () => {
    const slotW = 243
    const slotH = 272
    const slot = layoutCompositeInSlot('wood_tower', slotW, slotH, 0.92)
    expect(slot).not.toBeNull()

    expect(slot!.layers.platform!.width).toBeGreaterThan(slotW * 0.55)
    expect(slot!.layers.bomber!.height).toBeGreaterThan(slot!.layers.platform!.height * 0.5)
    expect(slot!.fit).toBeGreaterThan(0.2)
  })

  it('derives bomber placement from drag offset', () => {
    const platformH = compositeLayerDisplaySize('wood_tower', 'platform').height
    const placement = compositePlacementFromOffset('wood_tower', 'bomber', { x: 4, y: -6 })
    expect(placement.y).toBeCloseTo(-platformH * BOMB_TOWER_DECK_Y_FRAC - 6, 0)
    expect(placement.originY).toBe(BOMB_TOWER_BOMBER_FEET_Y)
  })
})
