import { loadSfxVolume } from '@data/AudioSettings'

/** Per-SFX mixing — polyphony cap, cooldown, and playback variation. */
export interface SfxMixRule {
  maxVoices: number
  cooldownMs: number
  baseVolume: number
  /** Multiplier jitter ± this fraction (e.g. 0.12 → ±12%). */
  volumeJitter: number
  /** Random detune spread in cents (100 ≈ one semitone). */
  detuneJitterCents: number
}

const DEFAULT_COMBAT_RULE: SfxMixRule = {
  maxVoices: 4,
  cooldownMs: 50,
  baseVolume: 0.55,
  volumeJitter: 0.12,
  detuneJitterCents: 100,
}

/** Combat hit SFX — tuned to avoid mud when swarms / spells stack. */
export const SFX_MIX_RULES: Record<string, SfxMixRule> = {
  sfx_blade_hit: { ...DEFAULT_COMBAT_RULE },
  sfx_blunt_hit: { ...DEFAULT_COMBAT_RULE },
  sfx_arrow_hit: {
    maxVoices: 3,
    cooldownMs: 50,
    baseVolume: 0.5,
    volumeJitter: 0.14,
    detuneJitterCents: 120,
  },
  sfx_cannon_hit: {
    maxVoices: 2,
    cooldownMs: 80,
    baseVolume: 0.45,
    volumeJitter: 0.1,
    detuneJitterCents: 60,
  },
  // One-shot intro fanfare — full volume, no variation, never overlaps itself.
  sfx_war_horn: {
    maxVoices: 1,
    cooldownMs: 3000,
    baseVolume: 0.8,
    volumeJitter: 0,
    detuneJitterCents: 0,
  },
}

export function sfxMixRule(sfxKey: string): SfxMixRule {
  return SFX_MIX_RULES[sfxKey] ?? DEFAULT_COMBAT_RULE
}

export function canPlaySfx(
  rule: SfxMixRule,
  nowMs: number,
  lastPlayedMs: number,
  activeVoiceCount: number,
): boolean {
  if (nowMs - lastPlayedMs < rule.cooldownMs) return false
  if (activeVoiceCount >= rule.maxVoices) return false
  return true
}

export function randomizedVolume(rule: SfxMixRule, master = loadSfxVolume()): number {
  const jitter = (Math.random() * 2 - 1) * rule.volumeJitter
  return Math.min(1, Math.max(0, rule.baseVolume * master * (1 + jitter)))
}

export function randomizedDetune(rule: SfxMixRule): number {
  return (Math.random() * 2 - 1) * rule.detuneJitterCents
}
