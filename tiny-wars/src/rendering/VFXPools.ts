import Phaser from 'phaser'
import { Owner } from '@core/types'
import { DUST_SHEETS, EXPLOSION_SHEET, MONK_HEAL_EFFECT_SHEETS, TROOP_DEATH_SHEET, WATER_SPLASH_SHEET } from '@data/AssetManifest'
import { CELL_SIZE, MAP_UNIT_TARGET_HEIGHT } from '@data/GameConstants'
import { registerDustFx, registerExplosionFx } from './AnimationRegistry'

// ─── EffectsPool ─────────────────────────────────────────────────────────────

const EFFECTS_POOL_SIZE = 10
const DEFAULT_EXPLOSION_RADIUS_PX = CELL_SIZE * 2.4

export class EffectsPool {
  private pool: Phaser.GameObjects.Sprite[] = []

  constructor(private scene: Phaser.Scene) {
    registerExplosionFx(scene)
    const texKey = scene.textures.exists(EXPLOSION_SHEET.key)
      ? EXPLOSION_SHEET.key
      : '__MISSING'
    for (let i = 0; i < EFFECTS_POOL_SIZE; i++) {
      const spr = scene.add.sprite(0, 0, texKey, 0)
        .setDepth(20)
        .setOrigin(0.5, 0.5)
        .setVisible(false)
      spr.setData('playing', false)
      this.pool.push(spr)
    }
  }

  /** @param sheet 'splash' swaps the round fire-explosion for a liquid spray burst (e.g. venom). */
  spawn(x: number, y: number, radiusPx?: number, tint?: number, sheet: 'explosion' | 'splash' = 'explosion'): void {
    const sheetDef = sheet === 'splash' ? WATER_SPLASH_SHEET : EXPLOSION_SHEET
    const spr = this.pool.find(p => !p.getData('playing'))
    if (
      !spr
      || !this.scene.textures.exists(sheetDef.key)
      || !this.scene.anims.exists(sheetDef.animKey)
    ) {
      return
    }

    const radius = radiusPx ?? DEFAULT_EXPLOSION_RADIUS_PX
    const size = Math.max(DEFAULT_EXPLOSION_RADIUS_PX, radius * 1.2)
    spr.setData('playing', true)
    spr.setTexture(sheetDef.key, 0)
    spr.setPosition(x, y)
    spr.setDisplaySize(size, size)
    spr.setVisible(true)
    spr.setAlpha(1)
    if (tint !== undefined) spr.setTint(tint)
    else spr.clearTint()
    spr.anims.stop()
    spr.play(sheetDef.animKey)

    spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      spr.setVisible(false)
      spr.setData('playing', false)
      spr.clearTint()
      spr.anims.stop()
    })
  }
}

// ─── HealEffectPool ──────────────────────────────────────────────────────────

const HEAL_POOL_SIZE = 20
const HEAL_EFFECT_DISPLAY = CELL_SIZE * 3.2
const UNIT_EFFECT_DISPLAY = CELL_SIZE * 2.2

export class HealEffectPool {
  private pool: Phaser.GameObjects.Sprite[] = []

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < HEAL_POOL_SIZE; i++) {
      const spr = scene.add.sprite(0, 0, MONK_HEAL_EFFECT_SHEETS.blue.key, 0)
        .setDepth(21)
        .setOrigin(0.5, 0.5)
        .setVisible(false)
      spr.setData('playing', false)
      this.pool.push(spr)
    }
  }

  spawnOnUnit(x: number, y: number, owner: Owner): void {
    this.playEffect(x, y, owner, UNIT_EFFECT_DISPLAY, 0.9)
  }

  spawn(x: number, y: number, owner: Owner, radiusCells: number): void {
    const size = Math.max(HEAL_EFFECT_DISPLAY, radiusCells * CELL_SIZE * 1.6)
    this.playEffect(x, y, owner, size, 0.85)
  }

  private playEffect(x: number, y: number, owner: Owner, size: number, alpha: number): void {
    const sheet = owner === Owner.PLAYER ? MONK_HEAL_EFFECT_SHEETS.blue : MONK_HEAL_EFFECT_SHEETS.red
    const burst = this.pool.find(p => !p.getData('playing'))
    if (!burst || !this.scene.anims.exists(sheet.animKey)) return

    burst.setData('playing', true)
    burst.setTexture(sheet.key, 0)
    burst.setPosition(x, y)
    burst.setDisplaySize(size, size)
    burst.setVisible(true)
    burst.setAlpha(alpha)
    burst.play(sheet.animKey)

    burst.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      burst.setVisible(false)
      burst.setData('playing', false)
      burst.anims.stop()
    })
  }
}

// ─── DeathPool ───────────────────────────────────────────────────────────────

const DEATH_DISPLAY_SIZE = MAP_UNIT_TARGET_HEIGHT * 1.1
/** Turtle splash covers its chilling death nova, so it reads larger than the skull puff. */
const SPLASH_DEATH_DISPLAY_SIZE = MAP_UNIT_TARGET_HEIGHT * 2.2

export class DeathPool {
  constructor(private scene: Phaser.Scene) {}

  spawn(x: number, y: number, flipX = false, cardId?: string): void {
    // Turtle death — water splash instead of the shared skull VFX.
    const sheet = cardId === 'turtle' ? WATER_SPLASH_SHEET : TROOP_DEATH_SHEET
    const size = cardId === 'turtle' ? SPLASH_DEATH_DISPLAY_SIZE : DEATH_DISPLAY_SIZE
    if (!this.scene.anims.exists(sheet.animKey)) return

    const sprite = this.scene.add.sprite(x, y, sheet.key, 0)
      .setDepth(5.5)
      .setDisplaySize(size, size)
      .setFlipX(flipX)

    sprite.play(sheet.animKey)
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy())
  }
}

// ─── GroundSlamPool ────────────────────────────────────────────────────────────

/** Minotaur ground slam (spawn drop + jump landing) — reuses the water-splash sheet so it
 *  reads as the ground itself cracking/splashing under the impact. */
export class GroundSlamPool {
  constructor(private scene: Phaser.Scene) {}

  spawn(x: number, y: number, size: number): void {
    if (!this.scene.anims.exists(WATER_SPLASH_SHEET.animKey)) return

    const sprite = this.scene.add.sprite(x, y, WATER_SPLASH_SHEET.key, 0)
      .setDepth(19)
      .setDisplaySize(size, size)

    sprite.play(WATER_SPLASH_SHEET.animKey)
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy())
  }
}

// ─── DustPool ─────────────────────────────────────────────────────────────────

const DUST_POOL_SIZE = 16
const DUST_MIN_PX = CELL_SIZE * 4

export class DustPool {
  private pool: Phaser.GameObjects.Sprite[] = []
  private nextSheet = 0

  constructor(private scene: Phaser.Scene) {
    registerDustFx(scene)
    for (let i = 0; i < DUST_POOL_SIZE; i++) {
      const spr = scene.add.sprite(0, 0, DUST_SHEETS[0].key, 0)
        .setDepth(18)
        .setOrigin(0.5, 1)
        .setVisible(false)
      spr.setData('playing', false)
      this.pool.push(spr)
    }
  }

  /**
   * @param sizeOverride Skip the DUST_MIN_PX landing-puff floor (e.g. a trail of small
   * footprint-sized puffs, where the default 4-cell minimum would swallow the whole trail).
   */
  spawn(x: number, y: number, unitDisplayH = DUST_MIN_PX, sizeOverride?: number): void {
    const spr = this.pool.find(p => !p.getData('playing'))
    if (!spr) return

    const sheet = DUST_SHEETS[this.nextSheet % DUST_SHEETS.length]
    this.nextSheet++

    if (!this.scene.textures.exists(sheet.key) || !this.scene.anims.exists(sheet.animKey)) return

    const size = sizeOverride ?? Math.max(DUST_MIN_PX, unitDisplayH * 1.2)
    spr.setData('playing', true)
    spr.setTexture(sheet.key, 0)
    spr.setPosition(x, y)
    spr.setDisplaySize(size, size)
    spr.setAlpha(0.85)
    spr.setVisible(true)
    spr.anims.stop()
    spr.play(sheet.animKey)

    spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      spr.setVisible(false)
      spr.setData('playing', false)
    })
  }
}
