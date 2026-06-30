import { describe, it, expect } from 'vitest'
import { Owner } from '@core/types'
import { getAttackWindupMs } from '@data/AssetManifest'
import { BOMB_TOWER_CREW_CARD_ID } from '@rendering/towerGarrison'

describe('BombTowerCrew lob timing', () => {
  it('lob release aligns with bomb_fish shoot hit frame (frame 4 @ 14fps)', () => {
    const windupMs = getAttackWindupMs(BOMB_TOWER_CREW_CARD_ID, Owner.PLAYER)
    expect(windupMs).toBeCloseTo((4 / 14) * 1000, 0)
  })
})
