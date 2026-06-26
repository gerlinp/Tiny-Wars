import { describe, it, expect } from 'vitest'
import { containAvatarScale } from './cardAvatarFit'
import { AVATAR_CROP_RATIO_DEFAULT } from '@data/AssetManifest'

describe('containAvatarScale', () => {
  it('fits wide frames to box width', () => {
    expect(containAvatarScale(200, 100, 100, 100)).toBe(0.5)
  })

  it('fits tall frames to box height', () => {
    expect(containAvatarScale(100, 200, 100, 100)).toBe(0.5)
  })

  it('uses the limiting axis so the full frame fits', () => {
    expect(containAvatarScale(192, 192, 90, 120)).toBeCloseTo(90 / 192, 5)
  })
})

describe('AVATAR_CROP_RATIO_DEFAULT', () => {
  it('is the standard portrait zoom used when a card has no override', () => {
    expect(AVATAR_CROP_RATIO_DEFAULT).toBe(0.62)
  })
})
