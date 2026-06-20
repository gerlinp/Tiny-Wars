import Phaser from 'phaser'

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload(): void {
    const { width, height } = this.scale

    // Progress bar background
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

    // Keep bar bg reference to avoid unused-var warning
    void barBg

    // --- Troops (Knights faction) ---
    this.load.image('warrior_blue', 'assets/Factions/Knights/Troops/Warrior/Blue/Warrior_Blue.png')
    this.load.image('warrior_red',  'assets/Factions/Knights/Troops/Warrior/Red/Warrior_Red.png')

    this.load.image('archer_blue', 'assets/Factions/Knights/Troops/Archer/Blue/Archer_Blue.png')
    this.load.image('archer_red',  'assets/Factions/Knights/Troops/Archer/Red/Archer_Red.png')

    this.load.image('pawn_blue', 'assets/Factions/Knights/Troops/Pawn/Blue/Pawn_Blue.png')
    this.load.image('pawn_red',  'assets/Factions/Knights/Troops/Pawn/Red/Pawn_Red.png')

    // --- Troops (Goblins faction) ---
    this.load.image('torch_blue', 'assets/Factions/Goblins/Troops/Torch/Blue/Torch_Blue.png')
    this.load.image('torch_red',  'assets/Factions/Goblins/Troops/Torch/Red/Torch_Red.png')

    this.load.image('tnt_blue', 'assets/Factions/Goblins/Troops/TNT/Blue/TNT_Blue.png')
    this.load.image('tnt_red',  'assets/Factions/Goblins/Troops/TNT/Red/TNT_Red.png')

    this.load.image('barrel_blue', 'assets/Factions/Goblins/Troops/Barrel/Blue/Barrel_Blue.png')
    this.load.image('barrel_red',  'assets/Factions/Goblins/Troops/Barrel/Red/Barrel_Red.png')

    // --- Buildings ---
    this.load.image('wood_tower_blue', 'assets/Factions/Goblins/Buildings/Wood_Tower/Wood_Tower_Blue.png')
    this.load.image('wood_tower_red',  'assets/Factions/Goblins/Buildings/Wood_Tower/Wood_Tower_Red.png')

    // --- Towers ---
    this.load.image('castle_blue', 'assets/Factions/Knights/Buildings/Castle/Castle_Blue.png')
    this.load.image('castle_red',  'assets/Factions/Knights/Buildings/Castle/Castle_Red.png')
    this.load.image('castle_destroyed', 'assets/Factions/Knights/Buildings/Castle/Castle_Destroyed.png')

    this.load.image('tower_blue',       'assets/Factions/Knights/Buildings/Tower/Tower_Blue.png')
    this.load.image('tower_red',        'assets/Factions/Knights/Buildings/Tower/Tower_Red.png')
    this.load.image('tower_destroyed',  'assets/Factions/Knights/Buildings/Tower/Tower_Destroyed.png')

    // --- Terrain ---
    this.load.image('terrain_flat', 'assets/Terrain/Tileset/Tilemap_Flat.png')

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
    this.scene.start('MainMenuScene')
  }
}
