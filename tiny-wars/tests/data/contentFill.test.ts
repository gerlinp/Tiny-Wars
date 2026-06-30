import { describe, it, expect } from 'vitest'
import { CARD_ASSET_BUNDLES } from '@data/AssetManifest'
import { MEASURED_CONTENT_FILL } from '@data/MeasuredContentFill'
import { logicDisplayHeightForCard } from '@rendering/assetDisplaySize'
import { MAP_UNIT_TARGET_HEIGHT, SPRITE_VISUAL_SCALE } from '@data/GameConstants'

describe('MeasuredContentFill', () => {
  it('matches every card bundle contentFill', () => {
    for (const bundle of CARD_ASSET_BUNDLES) {
      const expected = MEASURED_CONTENT_FILL[bundle.cardId as keyof typeof MEASURED_CONTENT_FILL]
      expect(expected, `missing measured fill for ${bundle.cardId}`).toBeDefined()
      expect(bundle.contentFill).toBe(expected)
    }
  })

  it('renders scaled troops at the same visible height (reference knight)', () => {
    const referenceVisible = MAP_UNIT_TARGET_HEIGHT * SPRITE_VISUAL_SCALE
    const pandaVisible = (MAP_UNIT_TARGET_HEIGHT / MEASURED_CONTENT_FILL.panda) * MEASURED_CONTENT_FILL.panda * SPRITE_VISUAL_SCALE
    expect(logicDisplayHeightForCard('panda') * MEASURED_CONTENT_FILL.panda).toBeCloseTo(referenceVisible, 0)
    expect(pandaVisible).toBeCloseTo(referenceVisible, 0)
    expect(logicDisplayHeightForCard('warrior') * MEASURED_CONTENT_FILL.warrior).toBeCloseTo(referenceVisible, 0)
  })

  it('panda display height increased after contentFill correction', () => {
    const oldHeight = (MAP_UNIT_TARGET_HEIGHT / 0.52) * SPRITE_VISUAL_SCALE
    expect(logicDisplayHeightForCard('panda')).toBeGreaterThan(oldHeight)
  })
})
