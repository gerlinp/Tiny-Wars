import Phaser from 'phaser'
import { FRAME_W, FRAME_H, getUniqueSheets, getCardAvatars, getCardAvatarBackdrops, getCardAvatarDef, TROOP_DEATH_SHEET, DAMAGE_FIRE_SHEETS, getHealthBarImageKeys, HEALTH_BAR_ASSETS } from '@data/AssetManifest'
import { registerCardAnimations, registerTroopDeathAnim, registerDamageFireAnims } from '@rendering/AnimationRegistry'
import { HEX_SHAMAN_EXPLOSION_SHEET, HEX_SHAMAN_PROJECTILE_SHEET } from '@data/AssetManifest'
import { TERRAIN_COLOR1, TERRAIN_WATER, TERRAIN_BRIDGE, BRIDGE_DECK } from '@data/TerrainManifest'
import { DEFAULT_DECK } from '@data/CardData'
import { setActiveMapConfig, getActiveMapConfig } from '@data/ActiveMapConfig'
import { DEFAULT_MAP_CONFIG } from '@data/DefaultMapConfig'
import type { MapConfig } from '@data/MapConfig'

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload(): void {
    this.load.json('map-config', 'map.json')
    this.load.on('filecomplete-json-map-config', (_key: string, _type: string, data: unknown) => {
      setActiveMapConfig(data as MapConfig)
    })
    this.load.on('loaderror', (file: { key?: string }) => {
      if (file.key === 'map-config') {
        setActiveMapConfig(DEFAULT_MAP_CONFIG)
      }
    })

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

    // Tree1/2: 1536×256 (8 frames at 192×256); Tree3/4: 1536×192 (8 frames at 192×192)
    for (const i of [1, 2]) {
      this.load.spritesheet(`tree${i}`, `assets/Terrain/Resources/Wood/Trees/Tree${i}.png`,
        { frameWidth: 192, frameHeight: 256 })
    }
    for (const i of [3, 4]) {
      this.load.spritesheet(`tree${i}`, `assets/Terrain/Resources/Wood/Trees/Tree${i}.png`,
        { frameWidth: 192, frameHeight: 192 })
    }

    // --- Placeable decorations ---
    // Stumps: 192×256, single frame
    for (let i = 1; i <= 4; i++) {
      this.load.image(`stump${i}`, `assets/Terrain/Resources/Wood/Trees/Stump ${i}.png`)
    }
    // Bushes: 1024×128, frame 128×128
    for (let i = 1; i <= 4; i++) {
      this.load.spritesheet(`bush${i}`, `assets/Terrain/Decorations/Bushes/Bushe${i}.png`,
        { frameWidth: 128, frameHeight: 128 })
    }
    // Rocks (land): 64×64, single frame
    for (let i = 1; i <= 4; i++) {
      this.load.image(`rock${i}`, `assets/Terrain/Decorations/Rocks/Rock${i}.png`)
    }
    // Water rocks: 1024×128, frame 128×128
    const wrockPad = (n: number) => String(n).padStart(2, '0')
    for (let i = 1; i <= 4; i++) {
      this.load.spritesheet(`wrock${i}`, `assets/Terrain/Water/Rocks/Rocks_${wrockPad(i)}.png`,
        { frameWidth: 128, frameHeight: 128 })
    }
    // Rocks in water: 1024×64, frame 128×64
    for (let i = 1; i <= 4; i++) {
      this.load.spritesheet(`wrock_in${i}`,
        `assets/Terrain/Decorations/Rocks in the Water/Water Rocks_${wrockPad(i)}.png`,
        { frameWidth: 128, frameHeight: 64 })
    }
    // Resources (single frames)
    this.load.image('gold', 'assets/Terrain/Resources/Gold/Gold Resource/Gold_Resource.png')
    this.load.image('wood', 'assets/Terrain/Resources/Wood/Wood Resource/Wood Resource.png')
    // Duck: 96×32, frame 32×32
    this.load.spritesheet('duck', 'assets/Terrain/Decorations/Rubber Duck/Rubber duck.png',
      { frameWidth: 32, frameHeight: 32 })

    // --- Terrain (code-driven tilemap — see TerrainMap.ts) ---
    this.load.spritesheet(TERRAIN_COLOR1.key, TERRAIN_COLOR1.path, {
      frameWidth: TERRAIN_COLOR1.frameWidth,
      frameHeight: TERRAIN_COLOR1.frameHeight,
    })
    this.load.image(TERRAIN_WATER.key, TERRAIN_WATER.path)
    this.load.image(TERRAIN_BRIDGE.key, TERRAIN_BRIDGE.path)

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
    if (!getActiveMapConfig()) {
      setActiveMapConfig(DEFAULT_MAP_CONFIG)
    }

    for (const cardId of DEFAULT_DECK) {
      const def = getCardAvatarDef(cardId)
      if (!this.textures.exists(def.key)) {
        throw new Error(
          `Card avatar "${def.key}" for "${cardId}" failed to load (path: ${def.path}).`,
        )
      }
    }

    // Register sub-frames using measured art bounds so setDisplaySize scales against
    // actual art dimensions — not the full 320×64 or 64×64 sheet.
    for (const variant of Object.values(HEALTH_BAR_ASSETS)) {
      const baseTex = this.textures.get(variant.base.key)
      const r = variant.baseRegions
      const bf = variant.baseFrame
      baseTex.add('leftCap',  0, r.leftCap.x,  bf.y, r.leftCap.w,  bf.h)
      baseTex.add('mid',      0, r.mid.x,      bf.y, r.mid.w,      bf.h)
      baseTex.add('rightCap', 0, r.rightCap.x, bf.y, r.rightCap.w, bf.h)

      const fillTex = this.textures.get(variant.fill.key)
      const ff = variant.fillFrame
      fillTex.add('fill', 0, 0, ff.y, 64, ff.h)
    }

    const bridgeTex = this.textures.get(TERRAIN_BRIDGE.key)
    const br = BRIDGE_DECK.regions
    bridgeTex.add('topCap',    0, br.topCap.x,    br.topCap.y,    br.topCap.w,    br.topCap.h)
    bridgeTex.add('mid',       0, br.mid.x,       br.mid.y,       br.mid.w,       br.mid.h)
    bridgeTex.add('bottomCap', 0, br.bottomCap.x, br.bottomCap.y, br.bottomCap.w, br.bottomCap.h)

    registerCardAnimations(this)
    registerTroopDeathAnim(this)
    registerDamageFireAnims(this)
    this.scene.start('MainMenuScene')
  }
}