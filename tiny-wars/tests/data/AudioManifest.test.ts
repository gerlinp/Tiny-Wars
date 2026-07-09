import { describe, it, expect } from 'vitest'
import {
  BLADE_HIT_SFX,
  BLUNT_HIT_SFX,
  ARROW_HIT_SFX,
  CANNON_HIT_SFX,
  hitSfxForMeleeCard,
  isBladeMeleeCard,
  isBluntMeleeCard,
  meleeTroopCardIdsByStrikeSfx,
  usesArrowProjectile,
  usesCannonHit,
} from '@data/AudioManifest'
import { EntityKind } from '@core/types'

describe('AudioManifest melee strikes', () => {
  it('maps blade troops to blade_hit and others to blunt_hit', () => {
    expect(hitSfxForMeleeCard('warrior')).toBe(BLADE_HIT_SFX)
    expect(hitSfxForMeleeCard('villagers')).toBe(BLADE_HIT_SFX)
    expect(hitSfxForMeleeCard('pig')).toBe(BLUNT_HIT_SFX)
    expect(hitSfxForMeleeCard('minotaur')).toBe(BLUNT_HIT_SFX)
  })

  it('registers combat sfx paths', () => {
    expect(BLADE_HIT_SFX.path).toContain('blade_hit.mp3')
    expect(BLUNT_HIT_SFX.path).toContain('blunt_hit.mp3')
    expect(ARROW_HIT_SFX.path).toContain('arrow_hit.wav')
    expect(CANNON_HIT_SFX.path).toContain('cannon_hit.wav')
  })

  it('classifies cannon hit attackers', () => {
    expect(usesCannonHit('air_boat', EntityKind.TROOP)).toBe(true)
    expect(usesCannonHit('goblin_demolisher', EntityKind.TROOP)).toBe(true)
    expect(usesCannonHit('wood_tower', EntityKind.BUILDING)).toBe(true)
    expect(usesCannonHit('', EntityKind.TOWER, true)).toBe(true)
    expect(usesCannonHit('', EntityKind.TOWER, false)).toBe(false)
    expect(usesCannonHit('warrior', EntityKind.TROOP)).toBe(false)
  })

  it('classifies arrow projectile attackers', () => {
    expect(usesArrowProjectile('archer', EntityKind.TROOP)).toBe(true)
    expect(usesArrowProjectile('elite_archer', EntityKind.TROOP)).toBe(true)
    expect(usesArrowProjectile('', EntityKind.TOWER, false)).toBe(true)
    expect(usesArrowProjectile('', EntityKind.TOWER, true)).toBe(false)
    expect(usesArrowProjectile('torch_goblin', EntityKind.TROOP)).toBe(false)
  })

  it('classifies every melee troop as blade or blunt', () => {
    const { blade, blunt } = meleeTroopCardIdsByStrikeSfx()
    expect(blade).toEqual(['lancer', 'thief', 'villagers', 'warrior'])
    expect(blunt).toContain('pig')
    expect(blunt).toContain('pig_rider')
    expect(blunt).toContain('skeleton')
    expect(blunt).toContain('troll')
    expect(blunt).toContain('panda')
    expect(blunt).toContain('monk')
    expect(blade.every(isBladeMeleeCard)).toBe(true)
    expect(blunt.every(id => isBluntMeleeCard(id))).toBe(true)
  })
})
