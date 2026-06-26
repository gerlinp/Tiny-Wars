import { describe, it, expect } from 'vitest'
import { HEALTH_BAR_ASSETS } from '@data/AssetManifest'
import {
  healthBarFillDisplayHeight,
  healthBarFillHorizontalInset,
  healthBarInnerWidth,
} from './healthBarLayout'

describe('healthBarLayout', () => {
  const big = HEALTH_BAR_ASSETS.big
  const small = HEALTH_BAR_ASSETS.small

  it('sizes big-bar fill to inner track height, not the full outer frame', () => {
    const barH = big.displayHeight
    const fillH = healthBarFillDisplayHeight(barH, {
      baseArtH: big.baseFrame.h,
      fillFrameH: big.fillFrame.h,
      fillInsetX: big.fillInsetX,
      fillHeightRatio: big.fillHeightRatio,
    })
    expect(fillH).toBeLessThan(barH * 0.55)
    expect(fillH).toBeCloseTo(barH * (big.fillFrame.h / big.baseFrame.h) * 0.96, 1)
  })

  it('insets big-bar fill horizontally past the cap border', () => {
    const barH = big.displayHeight
    const capW = Math.round(barH * (big.baseRegions.leftCap.w / big.baseFrame.h))
    const inset = healthBarFillHorizontalInset(barH, capW, {
      baseArtH: big.baseFrame.h,
      fillFrameH: big.fillFrame.h,
      fillInsetX: big.fillInsetX,
      fillHeightRatio: big.fillHeightRatio,
    })
    expect(inset).toBeGreaterThan(capW * big.fillInsetX)
  })

  it('keeps thin small-bar fill stretched but inside inner width', () => {
    const barH = small.displayHeight
    const barW = 56
    const capW = Math.round(barH * (small.baseRegions.leftCap.w / small.baseFrame.h))
    const inset = healthBarFillHorizontalInset(barH, capW, {
      baseArtH: small.baseFrame.h,
      fillFrameH: small.fillFrame.h,
      fillInsetX: small.fillInsetX,
      fillHeightRatio: small.fillHeightRatio,
    })
    const fillH = healthBarFillDisplayHeight(barH, {
      baseArtH: small.baseFrame.h,
      fillFrameH: small.fillFrame.h,
      fillInsetX: small.fillInsetX,
      fillHeightRatio: small.fillHeightRatio,
    })
    expect(fillH).toBeLessThan(barH * 0.6)
    expect(healthBarInnerWidth(barW, inset)).toBeLessThan(barW)
  })
})
