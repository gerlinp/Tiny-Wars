import Phaser from 'phaser'
import { FRAME_W, FRAME_H, getUniqueSheets, getCardAvatars, getCardAvatarBackdrops, getCardAvatarDef, TROOP_DEATH_SHEET, WATER_SPLASH_SHEET, DAMAGE_FIRE_SHEETS, EXPLOSION_SHEET, DUST_SHEETS, MONK_HEAL_EFFECT_SHEETS, GNOLL_BONE_SHEET, PADDLE_SHARK_IDLE_SHEET, PADDLE_SHARK_ROW_SHEET } from '@data/AssetManifest'
import { registerCardAnimations, registerTroopDeathAnim, registerDamageFireAnims, registerMonkHealFx, registerExplosionFx, registerGnollBoneFx, registerGoblinDynamiteFx, registerAirBoatCrewFx, registerHexTransformFx, registerShamanOrbFx } from '@rendering/AnimationRegistry'
import { HEX_SHAMAN_EXPLOSION_SHEET, HEX_SHAMAN_PROJECTILE_SHEET, HEX_SHAMAN_BASE_SHEETS, HEX_SHAMAN_BASE_AVATAR, HEX_SHAMAN_TRANSFORM_SPELL_SHEET, HEX_SHAMAN_EXPLOSION_SPELL_SHEET, HARPOON_PROJECTILE_SHEET, GOBLIN_DYNAMITE_SHEET, GARRISON_CANNON_BALL } from '@data/AssetManifest'
import { generateAllShamanTextures } from '@rendering/PaletteSwap'
import { TERRAIN_COLOR1, TERRAIN_ROAD, TERRAIN_PATH_FLAT, TERRAIN_PATH_STONE, TERRAIN_WATER, TERRAIN_BRIDGE, BRIDGE_DECK } from '@data/TerrainManifest'
import { preloadClouds } from '@ui/clouds'
import { DEFAULT_DECK } from '@data/CardData'
import { setActiveMapConfig, getActiveMapConfig } from '@data/ActiveMapConfig'
import { DEFAULT_MAP_CONFIG } from '@data/DefaultMapConfig'
import type { MapConfig } from '@data/MapConfig'
import { createLoadingWalker } from '@ui/loadingScreenUnit'
import { loadingWalkerRunSheet, pickRandomLoadingUnitId } from '@ui/loadingScreenUnitPick'
import { createLoadingBar, loadingBarProgress, loadingLayoutY, loadingWaitMs, setLoadingProgress } from '@ui/loadingScreenUi'
import { createWaterBackground } from '@ui/menuBackground'
import { getCombatSfx } from '@data/AudioManifest'

export class PreloadScene extends Phaser.Scene {
  private loadingUnitId = ''
  private loadingWalkerShown = false
  private loadingBar: ReturnType<typeof createLoadingBar> | null = null
  private walkerY = 0
  private loadStartedAt = 0
  private barTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload(): void {
    this.loadStartedAt = Date.now()
    this.loadingUnitId = pickRandomLoadingUnitId()
    const previewSheet = loadingWalkerRunSheet(this.loadingUnitId)

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
    createWaterBackground(this, width, height)

    const layout = loadingLayoutY(height)
    this.walkerY = layout.walkerY
    this.loadingBar = createLoadingBar(this, width, layout.barY, layout.labelY)

    this.barTimer = setInterval(() => this.tickLoadingBar(), 32)

    // Retry on each completed file — the air boat walker also needs its crew sheets, which stream
    // in after the boat sheet; createLoadingWalker returns null until everything it needs is ready.
    this.load.on('filecomplete', () => {
      if (!this.loadingWalkerShown) this.tryShowLoadingWalker()
    })

    // Random troop run sheet first so the walker can appear while the rest loads.
    this.load.spritesheet(previewSheet.key, previewSheet.path, {
      frameWidth: previewSheet.frameWidth,
      frameHeight: previewSheet.frameHeight,
    })

    // Air boat is a composite — load the paddle-shark crew sheets early too so the walker can
    // appear promptly with its rower rather than waiting for the full bulk load.
    if (this.loadingUnitId === 'air_boat') {
      for (const sheet of [PADDLE_SHARK_IDLE_SHEET, PADDLE_SHARK_ROW_SHEET]) {
        this.load.spritesheet(sheet.key, sheet.path, {
          frameWidth: sheet.frameWidth,
          frameHeight: sheet.frameHeight,
        })
      }
    }

    // Card unit spritesheets (animated)
    for (const sheet of getUniqueSheets()) {
      if (sheet.key === previewSheet.key) continue
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
    this.load.spritesheet(TERRAIN_ROAD.key, TERRAIN_ROAD.path, {
      frameWidth: TERRAIN_ROAD.frameWidth,
      frameHeight: TERRAIN_ROAD.frameHeight,
    })
    this.load.spritesheet(TERRAIN_PATH_FLAT.key, TERRAIN_PATH_FLAT.path, {
      frameWidth: TERRAIN_PATH_FLAT.frameWidth,
      frameHeight: TERRAIN_PATH_FLAT.frameHeight,
    })
    this.load.spritesheet(TERRAIN_PATH_STONE.key, TERRAIN_PATH_STONE.path, {
      frameWidth: TERRAIN_PATH_STONE.frameWidth,
      frameHeight: TERRAIN_PATH_STONE.frameHeight,
    })
    this.load.image(TERRAIN_WATER.key, TERRAIN_WATER.path)
    preloadClouds(this.load)
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
    // Base shaman sprite sheets — sources for runtime palette swaps
    for (const sheet of Object.values(HEX_SHAMAN_BASE_SHEETS)) {
      this.load.spritesheet(sheet.key, sheet.path, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight })
    }
    this.load.image(HEX_SHAMAN_BASE_AVATAR.key, HEX_SHAMAN_BASE_AVATAR.path)

    // Elder Shaman attack VFX sheets
    this.load.spritesheet(
      HEX_SHAMAN_TRANSFORM_SPELL_SHEET.key,
      HEX_SHAMAN_TRANSFORM_SPELL_SHEET.path,
      { frameWidth: HEX_SHAMAN_TRANSFORM_SPELL_SHEET.frameWidth, frameHeight: HEX_SHAMAN_TRANSFORM_SPELL_SHEET.frameHeight },
    )
    this.load.spritesheet(
      HEX_SHAMAN_EXPLOSION_SPELL_SHEET.key,
      HEX_SHAMAN_EXPLOSION_SPELL_SHEET.path,
      { frameWidth: HEX_SHAMAN_EXPLOSION_SPELL_SHEET.frameWidth, frameHeight: HEX_SHAMAN_EXPLOSION_SPELL_SHEET.frameHeight },
    )
    this.load.image(HARPOON_PROJECTILE_SHEET.key, HARPOON_PROJECTILE_SHEET.path)
    this.load.image(GARRISON_CANNON_BALL.key, GARRISON_CANNON_BALL.path)

    this.load.spritesheet(GNOLL_BONE_SHEET.key, GNOLL_BONE_SHEET.path, {
      frameWidth: GNOLL_BONE_SHEET.frameWidth,
      frameHeight: GNOLL_BONE_SHEET.frameHeight,
    })

    // Air boat pick already queued these early for the loading walker — avoid a duplicate key.
    if (this.loadingUnitId !== 'air_boat') {
      for (const sheet of [PADDLE_SHARK_IDLE_SHEET, PADDLE_SHARK_ROW_SHEET]) {
        this.load.spritesheet(sheet.key, sheet.path, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight })
      }
    }

    this.load.spritesheet(GOBLIN_DYNAMITE_SHEET.key, GOBLIN_DYNAMITE_SHEET.path, {
      frameWidth: GOBLIN_DYNAMITE_SHEET.frameWidth,
      frameHeight: GOBLIN_DYNAMITE_SHEET.frameHeight,
    })

    for (const sheet of Object.values(MONK_HEAL_EFFECT_SHEETS)) {
      this.load.spritesheet(sheet.key, sheet.path, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      })
    }

    // --- Effects ---
    for (const sheet of DUST_SHEETS) {
      this.load.spritesheet(sheet.key, sheet.path, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      })
    }
    this.load.spritesheet(EXPLOSION_SHEET.key, EXPLOSION_SHEET.path, {
      frameWidth: EXPLOSION_SHEET.frameWidth,
      frameHeight: EXPLOSION_SHEET.frameHeight,
    })
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
    this.load.spritesheet(
      WATER_SPLASH_SHEET.key,
      WATER_SPLASH_SHEET.path,
      { frameWidth: WATER_SPLASH_SHEET.frameWidth, frameHeight: WATER_SPLASH_SHEET.frameHeight },
    )

    // --- UI ---
    this.load.image('button_blue',      'assets/UI/Buttons/Button_Blue.png')
    this.load.image('button_blue_wide', 'assets/UI/Buttons/Button_Blue_3Slides.png')
    this.load.image('button_red_wide',  'assets/UI/Buttons/Button_Red_3Slides.png')
    this.load.image('button_red',       'assets/UI/Buttons/Button_Red.png')
    this.load.image('carved_panel',   'assets/UI/Banners/Carved_9Slides.png')
    this.load.image('banner_h',       'assets/UI/Banners/Banner_Horizontal.png')
    this.load.image('placement_reticle', 'assets/UI/Pointers/02.png')

    // Health-bar art is already loaded by BootScene (so this scene's own loading
    // bar can use it from frame one) — no need to queue it again here.

    for (const sfx of getCombatSfx()) {
      this.load.audio(sfx.key, sfx.path)
    }
  }

  private tryShowLoadingWalker(): void {
    if (this.loadingWalkerShown) return
    const walker = createLoadingWalker(this, this.loadingUnitId, this.scale.width / 2, this.walkerY)
    // May be null while the (air boat) crew sheets are still streaming — retry on the next file.
    if (walker) this.loadingWalkerShown = true
  }

  private tickLoadingBar(): void {
    if (!this.loadingBar) return
    setLoadingProgress(this.loadingBar, loadingBarProgress(Date.now() - this.loadStartedAt))
  }

  private stopBarTimer(): void {
    if (this.barTimer !== null) {
      clearInterval(this.barTimer)
      this.barTimer = null
    }
  }

  create(): void {
    this.stopBarTimer()

    if (!this.loadingWalkerShown) {
      this.tryShowLoadingWalker()
    }

    const elapsed = Date.now() - this.loadStartedAt
    const waitMs = loadingWaitMs(elapsed)
    const startFrac = loadingBarProgress(elapsed)

    if (waitMs > 0 && this.loadingBar) {
      this.tweens.addCounter({
        from: startFrac,
        to: 1,
        duration: waitMs,
        onUpdate: (tween) => {
          if (this.loadingBar) setLoadingProgress(this.loadingBar, tween.getValue() ?? 0)
        },
      })
    } else if (this.loadingBar) {
      setLoadingProgress(this.loadingBar, 1)
    }

    if (!getActiveMapConfig()) {
      setActiveMapConfig(DEFAULT_MAP_CONFIG)
    }

    // Generate all palette-swapped shaman textures from the loaded base sprites
    generateAllShamanTextures(this)

    for (const cardId of DEFAULT_DECK) {
      const def = getCardAvatarDef(cardId)
      if (!this.textures.exists(def.key)) {
        throw new Error(
          `Card avatar "${def.key}" for "${cardId}" failed to load (path: ${def.path}).`,
        )
      }
    }

    // Health-bar sub-frames are registered in BootScene.create(), before this
    // scene's own loading bar needs them — see registerHealthBarFrames().

    const bridgeTex = this.textures.get(TERRAIN_BRIDGE.key)
    const br = BRIDGE_DECK.regions
    bridgeTex.add('topCap',    0, br.topCap.x,    br.topCap.y,    br.topCap.w,    br.topCap.h)
    bridgeTex.add('mid',       0, br.mid.x,       br.mid.y,       br.mid.w,       br.mid.h)
    bridgeTex.add('bottomCap', 0, br.bottomCap.x, br.bottomCap.y, br.bottomCap.w, br.bottomCap.h)

    registerCardAnimations(this)
    registerTroopDeathAnim(this)
    registerDamageFireAnims(this)
    registerMonkHealFx(this)
    registerExplosionFx(this)
    registerHexTransformFx(this)
    registerShamanOrbFx(this)
    registerGnollBoneFx(this)
    registerGoblinDynamiteFx(this)
    registerAirBoatCrewFx(this)

    this.time.delayedCall(waitMs, () => this.scene.start('MainMenuScene'))
  }
}