import { describe, it, expect } from 'vitest'
import {
  canPlaySfx,
  randomizedDetune,
  randomizedVolume,
  sfxMixRule,
  SFX_MIX_RULES,
} from '../../src/audio/SfxMix'

describe('SfxMix', () => {
  const rule = sfxMixRule('sfx_blade_hit')

  it('caps polyphony and cooldown per sfx key', () => {
    expect(SFX_MIX_RULES.sfx_arrow_hit!.maxVoices).toBe(3)
    expect(SFX_MIX_RULES.sfx_blade_hit!.maxVoices).toBe(4)
    expect(canPlaySfx(rule, 100, 0, 0)).toBe(true)
    expect(canPlaySfx(rule, 100, 80, 0)).toBe(false)
    expect(canPlaySfx(rule, 200, 100, rule.maxVoices)).toBe(false)
    expect(canPlaySfx(rule, 200, 100, rule.maxVoices - 1)).toBe(true)
  })

  it('randomizes volume within jitter bounds', () => {
    const samples = Array.from({ length: 40 }, () => randomizedVolume(rule, 1))
    const min = rule.baseVolume * (1 - rule.volumeJitter)
    const max = rule.baseVolume * (1 + rule.volumeJitter)
    for (const v of samples) {
      expect(v).toBeGreaterThanOrEqual(min - 0.001)
      expect(v).toBeLessThanOrEqual(max + 0.001)
    }
  })

  it('randomizes detune within cents spread', () => {
    const samples = Array.from({ length: 40 }, () => randomizedDetune(rule))
    for (const d of samples) {
      expect(Math.abs(d)).toBeLessThanOrEqual(rule.detuneJitterCents + 0.001)
    }
  })
})
