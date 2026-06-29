import { describe, expect, it } from 'vitest'
import {
  AIR_BOAT_AVATAR_CROP_RATIO,
  AIR_BOAT_AVATAR_SHARK_SCALE,
  layoutAirBoatPortrait,
} from '@ui/airBoatPortraitLayout'

describe('layoutAirBoatPortrait', () => {
  const frame = 256
  const slotW = 284
  const slotH = 447
  const sharkToBoat = 0.42 / 0.55

  it('centres the hull in the slot and uses full-frame shark sizing', () => {
    const layout = layoutAirBoatPortrait(
      frame,
      frame,
      slotW,
      slotH,
      AIR_BOAT_AVATAR_CROP_RATIO,
      0.82,
      sharkToBoat,
    )

    expect(layout.boatY).not.toBe(0)
    expect(layout.shark.height).toBeCloseTo(
      sharkToBoat * frame * layout.scale * AIR_BOAT_AVATAR_SHARK_SCALE,
    )
    expect(layout.shark.x).toBeLessThan(0)
  })

  it('uses uniform scale without vertical stretch', () => {
    const layout = layoutAirBoatPortrait(
      frame,
      frame,
      slotW,
      slotH,
      AIR_BOAT_AVATAR_CROP_RATIO,
      0.82,
      sharkToBoat,
    )

    const cropW = frame * AIR_BOAT_AVATAR_CROP_RATIO
    expect(layout.scale).toBeCloseTo(slotW / cropW)
  })
})
