import Phaser from 'phaser'
import { MELEE_HIT_SFX } from '@data/AudioManifest'

const MELEE_HIT_VOLUME = 0.55

export class SoundManager {
  private unlocked = false

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

  playMeleeHit(): void {
    if (!this.scene.cache.audio.exists(MELEE_HIT_SFX.key)) return
    try {
      this.scene.sound.play(MELEE_HIT_SFX.key, { volume: MELEE_HIT_VOLUME })
    } catch {
      // Browser may block audio until the user interacts.
    }
  }
}
