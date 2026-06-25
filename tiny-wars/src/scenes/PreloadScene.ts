import Phaser from 'phaser'
import { FRAME_W, FRAME_H, getUniqueSheets, getCardAvatars, getCardAvatarBackdrops, getCardAvatarDef, TROOP_DEATH_SHEET, DAMAGE_FIRE_SHEETS, getHealthBarImageKeys } from '@data/AssetManifest'
import { registerCardAnimations, registerTroopDeathAnim, registerDamageFireAnims } from '@rendering/AnimationRegistry'
import { HEX_SHAMAN_EXPLOSION_SHEET, HEX_SHAMAN_PROJECTILE_SHEET } from '@data/AssetManifest'
import { DEFAULT_DECK } from '@data/CardData'

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload(): void {
    const { width, height } = this.scale

    const barBg = this.add.rectangle(width / 2, height / 2, 300, 20, 0x333366)
    const bar = this.add.rectangle(width / 2 - 150, height / 2, 0, 16, 0x6688cc)
    bar.setOrigin(0, 0.5)

    const label = this.add.text(width / 2, height / 2 + 24, 'Loading...', {
      fontSize: '14px',
      color: '#aabbff',
    }).setOrigin(0.5)

    this.load.on('progress', (value: number) => {
      bar.width = 296 * value
      label.setText(`Loading... ${Math.round(value * 100)}%`)
    })

    void barBg

    // Card unit spritesheets (animated)
    for (const sheet of getUniqueSheets()) {
      this.load.spritesheet(sheet.key, sheet.path, {
        frameWidth: sheet.frameWidth ?? FRAME_W,
        frameHeight: sheet.frameHeight ?? FRAME_H,
      })
    }

    for (const avatar of getCardAvatars()) {
      if (avatar.frameWidth && avatar.frameHeight) {
        this.load.spritesheet(avatar.key, avatar.path, {
          frameWidth: avatar.frameWidth,
          frameHeight: avatar.frameHeight,
        })
      } else {
        this.load.image(avatar.key, avatar.path)
      }
    }

    for (const backdrop of getCardAvatarBackdrops()) {
      this.load.image(backdrop.key, backdrop.path)
    }

    // --- Towers (static) ---
    this.load.image('castle_blue', 'assets/Factions/Knights/Buildings/Castle/Castle_Blue.png')
    this.load.image('castle_red',  'assets/Factions/Knights/Buildings/Castle/Castle_Red.png')
    this.load.image('castle_destroyed', 'assets/Factions/Knights/Buildings/Castle/Castle_Destroyed.png')

    this.load.image('tower_blue',       'assets/Factions/Knights/Buildings/Tower/Tower_Blue.png')
    this.load.image('tower_red',        'assets/Factions/Knights/Buildings/Tower/Tower_Red.png')
    this.load.image('tower_destroyed',  'assets/Factions/Knights/Buildings/Tower/Tower_Destroyed.png')

    // --- Terrain ---
    this.load.image('terrain_flat', 'assets/Terrain/Tileset/Tilemap_Flat.png')

    // --- Projectiles (companion Arrow.png — same sprite as Archer_Shoot frames) ---
    this.load.image('arrow_blue', 'assets/Units/Blue Units/Archer/Arrow.png')
    this.load.image('arrow_red',  'assets/Units/Red Units/Archer/Arrow.png')

    this.load.spritesheet(
      HEX_SHAMAN_PROJECTILE_SHEET.key,
      HEX_SHAMAN_PROJECTILE_SHEET.path,
      { frameWidth: HEX_SHAMAN_PROJECTILE_SHEET.frameWidth, frameHeight: HEX_SHAMAN_PROJECTILE_SHEET.frameHeight },
    )
    this.load.spritesheet(
      HEX_SHAMAN_EXPLOSION_SHEET.key,
      HEX_SHAMAN_EXPLOSION_SHEET.path,
      { frameWidth: HEX_SHAMAN_EXPLOSION_SHEET.frameWidth, frameHeight: HEX_SHAMAN_EXPLOSION_SHEET.frameHeight },
    )

    // --- Effects ---
    this.load.image('explosion_1', 'assets/Particle FX/Explosion_01.png')
    this.load.image('explosion_2', 'assets/Particle FX/Explosion_02.png')
    for (const sheet of DAMAGE_FIRE_SHEETS) {
      this.load.spritesheet(sheet.key, sheet.path, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      })
    }

    this.load.spritesheet(
      TROOP_DEATH_SHEET.key,
      TROOP_DEATH_SHEET.path,
      { frameWidth: TROOP_DEATH_SHEET.frameWidth, frameHeight: TROOP_DEATH_SHEET.frameHeight },
    )

    // --- UI ---
    this.load.image('button_blue',    'assets/UI/Buttons/Button_Blue.png')
    this.load.image('button_red',     'assets/UI/Buttons/Button_Red.png')
    this.load.image('carved_panel',   'assets/UI/Banners/Carved_9Slides.png')
    this.load.image('banner_h',       'assets/UI/Banners/Banner_Horizontal.png')

    for (const bar of getHealthBarImageKeys()) {
      this.load.image(bar.key, bar.path)
    }
  }

  create(): void {
    for (const cardId of DEFAULT_DECK) {
      const def = getCardAvatarDef(cardId)
      if (!this.textures.exists(def.key)) {
        throw new Error(
          `Card avatar "${def.key}" for "${cardId}" failed to load (path: ${def.path}).`,
        )
      }
    }

    registerCardAnimations(this)
    registerTroopDeathAnim(this)
    registerDamageFireAnims(this)
    this.scene.start('MainMenuScene')
  }
}