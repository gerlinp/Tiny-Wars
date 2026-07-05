import Phaser from 'phaser'
import {
  BLADE_HIT_SFX,
  BLUNT_HIT_SFX,
  ARROW_HIT_SFX,
  CANNON_HIT_SFX,
  WAR_HORN_SFX,
  isBladeMeleeCard,
  type SfxDef,
} from '@data/AudioManifest'
import {
  canPlaySfx,
  randomizedDetune,
  randomizedVolume,
  sfxMixRule,
} from './SfxMix'

export class SoundManager {
  private unlocked = false
  private lastPlayedMs = new Map<string, number>()
  private activeVoices = new Map<string, Phaser.Sound.BaseSound[]>()

  constructor(private readonly scene: Phaser.Scene) {
    scene.input.once('pointerdown', () => this.unlockAudioContext())
  }

  private unlockAudioContext(): void {
    if (this.unlocked) return
    this.unlocked = true
    const sound = this.scene.sound as Phaser.Sound.WebAudioSoundManager
    const ctx = sound.context
    if (ctx?.state === 'suspended') void ctx.resume()
  }

  playBladeHit(): void {
    this.playSfx(BLADE_HIT_SFX)
  }

  playBluntHit(): void {
    this.playSfx(BLUNT_HIT_SFX)
  }

  playArrowHit(): void {
    this.playSfx(ARROW_HIT_SFX)
  }

  playCannonHit(): void {
    this.playSfx(CANNON_HIT_SFX)
  }

  playWarHorn(): void {
    this.playSfx(WAR_HORN_SFX)
  }

  playMeleeStrike(cardId: string): void {
    if (isBladeMeleeCard(cardId)) this.playBladeHit()
    else this.playBluntHit()
  }

  private activeVoiceCount(key: string): number {
    const voices = this.pruneVoices(key)
    return voices.length
  }

  private pruneVoices(key: string): Phaser.Sound.BaseSound[] {
    const voices = (this.activeVoices.get(key) ?? []).filter(v => v.isPlaying)
    this.activeVoices.set(key, voices)
    return voices
  }

  private playSfx(sfx: SfxDef): void {
    if (!this.scene.cache.audio.exists(sfx.key)) return

    const rule = sfxMixRule(sfx.key)
    const now = performance.now()
    const last = this.lastPlayedMs.get(sfx.key) ?? 0
    const active = this.activeVoiceCount(sfx.key)
    if (!canPlaySfx(rule, now, last, active)) return

    try {
      const instance = this.scene.sound.add(sfx.key)
      instance.play({
        volume: randomizedVolume(rule),
        detune: randomizedDetune(rule),
      })

      this.lastPlayedMs.set(sfx.key, now)
      const voices = this.pruneVoices(sfx.key)
      voices.push(instance)
      this.activeVoices.set(sfx.key, voices)

      instance.once('complete', () => {
        this.pruneVoices(sfx.key)
        instance.destroy()
      })
    } catch {
      // Browser may block audio until the user interacts.
    }
  }
}
