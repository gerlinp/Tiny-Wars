import Phaser from 'phaser'
import { FRAME_W, FRAME_H, getUniqueSheets } from '@data/AssetManifest'
import { registerCardAnimations } from '@rendering/AnimationRegistry'

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
        frameWidth: FRAME_W,
        frameHeight: FRAME_H,
      })
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

    // --- Projectiles ---
    this.load.image('arrow', 'assets/Units/Blue Units/Archer/Arrow.png')

    // --- Effects ---
    this.load.image('explosion_1', 'assets/Particle FX/Explosion_01.png')
    this.load.image('explosion_2', 'assets/Particle FX/Explosion_02.png')
    this.load.image('fire_1', 'assets/Particle FX/Fire_01.png')

    // --- UI ---
    this.load.image('button_blue',    'assets/UI/Buttons/Button_Blue.png')
    this.load.image('button_red',     'assets/UI/Buttons/Button_Red.png')
    this.load.image('carved_panel',   'assets/UI/Banners/Carved_9Slides.png')
    this.load.image('banner_h',       'assets/UI/Banners/Banner_Horizontal.png')
    this.load.image('dead_sprite',    'assets/Factions/Knights/Troops/Dead/Dead.png')
  }

  create(): void {
    registerCardAnimations(this)
    this.scene.start('MainMenuScene')
  }
}