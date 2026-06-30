import { Owner } from '@core/types'

export const FRAME_W = 192
export const FRAME_H = 192

/** Default center-crop for card-hand portraits (see cardHandLayout). */
export const AVATAR_CROP_RATIO_DEFAULT = 0.62

/** Shared skull death VFX — Knights/Troops/Dead/Dead.png (7×2 grid @ 128px). */
export const TROOP_DEATH_SHEET = {
  key: 'troop_death_sheet',
  path: 'assets/Factions/Knights/Troops/Dead/Dead.png',
  frameWidth: 128,
  frameHeight: 128,
  frameStart: 0,
  frameEnd: 13,
  frameRate: 12,
  animKey: 'troop_death',
} as const

/** Generic combat explosion — Effects/Explosion/Explosions.png (9 frames @ 192px). */
export const EXPLOSION_SHEET = {
  key: 'fx_explosion',
  path: 'assets/Effects/Explosion/Explosions.png',
  frameWidth: FRAME_W,
  frameHeight: FRAME_H,
  frameEnd: 8,
  frameRate: 18,
  animKey: 'fx_explosion_anim',
} as const

/** Building/tower damage fire — horizontal strips @ 64px; one sheet per HP tier. */
export const DAMAGE_FIRE_SHEETS = [
  {
    key: 'fire_01',
    path: 'assets/Particle FX/Fire_01.png',
    frameWidth: 64,
    frameHeight: 64,
    frameEnd: 7,
    animKey: 'damage_fire_1',
    frameRate: 10,
  },
  {
    key: 'fire_02',
    path: 'assets/Particle FX/Fire_02.png',
    frameWidth: 64,
    frameHeight: 64,
    frameEnd: 9,
    animKey: 'damage_fire_2',
    frameRate: 10,
  },
  {
    key: 'fire_03',
    path: 'assets/Particle FX/Fire_03.png',
    frameWidth: 64,
    frameHeight: 64,
    frameEnd: 11,
    animKey: 'damage_fire_3',
    frameRate: 10,
  },
] as const

export const DAMAGE_FIRE_GRID = { cols: 6, rows: 2 } as const

const UI_BARS = 'assets/UI Elements/UI Elements/Bars'

/**
 * Tiny Swords "Live Bars" — 320×64 base sheets with 3 separated art clusters.
 * Crop only opaque art (not sheet padding); centre is the 64px middle strip only.
 */
export const HEALTH_BAR_TEXTURE_H = 64
export const HEALTH_BAR_BASE_SHEET_W = 320

export interface HealthBarTextureRegion {
  /** Left edge column in the base sheet (inclusive). */
  x: number
  /** Width in texture pixels. */
  w: number
}

export interface HealthBarBaseRegions {
  leftCap: HealthBarTextureRegion
  mid: HealthBarTextureRegion
  rightCap: HealthBarTextureRegion
}

export interface HealthBarArtFrame {
  /** Y offset of the art band in the texture. */
  y: number
  /** Height of the art band in pixels. */
  h: number
}

export const HEALTH_BAR_ASSETS = {
  small: {
    base: { key: 'health_bar_sm_base', path: `${UI_BARS}/SmallBar_Base.png` },
    fill: { key: 'health_bar_sm_fill', path: `${UI_BARS}/SmallBar_Fill.png` },
    fillPlayer: { key: 'health_bar_sm_fill_player', path: `${UI_BARS}/SmallBar_Fill_Player.png` },
    displayHeight: 48,
    baseRegions: {
      leftCap:  { x: 49,  w: 15 },
      mid:      { x: 128, w: 64 },
      rightCap: { x: 256, w: 15 },
    },
    /** Opaque art band in SmallBar_Base.png — rows 22–40 of the 64-row sheet. */
    baseFrame: { y: 22, h: 19 },
    /** Opaque art band in SmallBar_Fill.png — rows 30–32 of the 64-row sheet. */
    fillFrame: { y: 30, h: 3 },
    /** Fraction of cap display width to leave as visible outer border on each side (thin fills). */
    fillInsetX: 0.28,
    /** Fill height as a fraction of the bar display height (thin small-bar stripe only). */
    fillHeightRatio: 0.48,
  },
  big: {
    base: { key: 'health_bar_lg_base', path: `${UI_BARS}/BigBar_Base.png` },
    fill: { key: 'health_bar_lg_fill', path: `${UI_BARS}/BigBar_Fill.png` },
    fillPlayer: { key: 'health_bar_lg_fill_player', path: `${UI_BARS}/BigBar_Fill_Player.png` },
    displayHeight: 80,
    baseRegions: {
      leftCap:  { x: 40,  w: 24 },
      mid:      { x: 128, w: 64 },
      rightCap: { x: 256, w: 24 },
    },
    /** Opaque art band in BigBar_Base.png — rows 9–59 of the 64-row sheet. */
    baseFrame: { y: 9, h: 51 },
    /** Opaque art band in BigBar_Fill.png — rows 20–43 of the 64-row sheet. */
    fillFrame: { y: 20, h: 24 },
    fillInsetX: 0.28,
    /** Ignored for big bars — fill height is derived from fill/base art bands. */
    fillHeightRatio: 0.72,
  },
} as const satisfies Record<string, {
  base: { key: string; path: string }
  fill: { key: string; path: string }
  fillPlayer: { key: string; path: string }
  displayHeight: number
  baseRegions: HealthBarBaseRegions
  baseFrame: HealthBarArtFrame
  fillFrame: HealthBarArtFrame
  fillInsetX: number
  fillHeightRatio: number
}>

export function getHealthBarImageKeys(): { key: string; path: string }[] {
  const keys: { key: string; path: string }[] = []
  for (const variant of Object.values(HEALTH_BAR_ASSETS)) {
    keys.push(variant.base, variant.fill, variant.fillPlayer)
  }
  return keys
}

export interface SheetDef {
  key: string
  path: string
  frameWidth?: number
  frameHeight?: number
}

export interface ClipDef {
  sheet: SheetDef
  start: number
  end: number
  frameRate: number
  repeat: number
  /** When set, play these sheet indices in order (skips empty cells). */
  frames?: number[]
}

export interface SideAssets {
  idle: ClipDef
  run: ClipDef
  attack: ClipDef
  /** Lancer — vertical attack clips (horizontal uses `attack`). */
  attackUp?: ClipDef
  attackDown?: ClipDef
  /** Knights archer — diagonal/down-left shoot clips (horizontal uses `attack` + flipX). */
  attackDownRight?: ClipDef
  attackDownLeft?: ClipDef
}

export interface ImageDef {
  key: string
  path: string
  /** When set, avatar is loaded as a spritesheet and `frame` selects the portrait. */
  frameWidth?: number
  frameHeight?: number
  frame?: number
}

export interface CardAssetBundle {
  cardId: string
  /** Static portrait for the card hand UI — required; never substitute a placeholder. */
  avatar: ImageDef
  /** Parchment/shield frame for raw unit sprites (matches enemy avatar backing). */
  avatarBackdrop?: ImageDef
  /** When false, render first frame only — no sprite animation */
  animated?: boolean
  /**
   * Fraction of frame height occupied by visible art (sprite-sheet padding compensation).
   * Display size follows native frame dimensions — not Clash Royale unit tier.
   */
  contentFill?: number
  /** Collision width vs height (narrow towers — default 1) */
  footprintWidthRatio?: number
  /** Collision height vs display height — base footprint only (default 1) */
  footprintHeightRatio?: number
  /** Sheet frame index where the strike/release lands (defaults to last attack frame) */
  attackHitFrame?: number
  /**
   * Enemy Pack units with one palette — bot side gets a red battle tint.
   * Player and bot share the same sprite files (separate texture keys for anims).
   */
  tintBotSide?: boolean
  /**
   * Card-hand portrait scale multiplier (1 = default slot fit).
   * Warrior crest art fills more of the frame than other human avatars.
   */
  avatarHandScale?: number
  /**
   * Center-crop fraction for the hand portrait (default 0.62). Higher = more of the frame
   * visible, slightly smaller on screen. Use 1 for full-frame contain (no crop).
   */
  avatarCropRatio?: number
  /**
   * Vertical focus of the portrait crop (0 = top of frame, 0.5 = centre, 1 = bottom). Default 0.5.
   * Use a higher value to centre on a subject in the lower part of the frame (e.g. the boat hull
   * at the bottom of the air boat frame, below the balloon).
   */
  avatarFocusY?: number
  /** Tall building sprites — fit full frame in the slot instead of portrait crop. */
  avatarBuildingFit?: boolean
  /**
   * Composite units (platform + crew): use unit-editor layer layout for the card hand
   * instead of the static {@link avatar} PNG.
   */
  useEditorCompositeAvatar?: boolean
  /** Composite portrait — spawn units in the same cluster layout as deploy. */
  avatarSwarmSourceCardId?: string
  /**
   * Y origin for the sprite (0 = top, 0.5 = centre, 1 = bottom). Default 0.5.
   * When set, the entity simulation position aligns to this fraction of the sprite height,
   * letting the visual body (e.g. a boat at the bottom of an airship frame) sit at ground level.
   */
  spriteOriginY?: number
  player: SideAssets
  bot: SideAssets
}

function knightSheet(side: 'Blue' | 'Red', unit: string, clip: 'idle' | 'run' | 'attack'): SheetDef {
  const folder = side === 'Blue' ? 'Blue Units' : 'Red Units'
  const prefix = side === 'Blue' ? 'blue' : 'red'
  const fileAnim = clip === 'attack'
    ? (unit === 'Archer' ? 'Shoot' : 'Attack1')
    : clip === 'run' ? 'Run' : 'Idle'
  return {
    key: `${unit.toLowerCase()}_${prefix}_${clip}`,
    path: `assets/Units/${folder}/${unit}/${unit}_${fileAnim}.png`,
  }
}

function knightSide(unit: string, side: 'Blue' | 'Red'): SideAssets {
  const idle   = knightSheet(side, unit, 'idle')
  const run    = knightSheet(side, unit, 'run')
  const attack = unit === 'Pawn' ? idle : knightSheet(side, unit, 'attack')

  const counts: Record<string, { idle: number; run: number; attack: number }> = {
    Warrior: { idle: 7, run: 5, attack: 3 },
    Archer:  { idle: 5, run: 3, attack: 7 },
    Pawn:    { idle: 5, run: 5, attack: 5 },
  }
  const c = counts[unit] ?? { idle: 5, run: 5, attack: 5 }

  return {
    idle:   clip(idle,   0, c.idle,   10, -1),
    run:    clip(run,    0, c.run,    14, -1),
    attack: clip(attack, 0, c.attack, 14, -1),
  }
}

function monkSheet(side: 'Blue' | 'Red', clip: 'idle' | 'run' | 'attack'): SheetDef {
  const folder = side === 'Blue' ? 'Blue Units' : 'Red Units'
  const prefix = side === 'Blue' ? 'blue' : 'red'
  const fileClip = clip === 'idle' ? 'Idle' : clip === 'run' ? 'Run' : 'Heal'
  return {
    key: `monk_${prefix}_${clip}`,
    path: `assets/Units/${folder}/Monk/${fileClip}.png`,
    frameWidth: FRAME_W,
    frameHeight: FRAME_H,
  }
}

function monkSide(side: 'Blue' | 'Red'): SideAssets {
  const idle   = monkSheet(side, 'idle')
  const run    = monkSheet(side, 'run')
  const attack = monkSheet(side, 'attack')
  return {
    idle:   clip(idle,   0, 5,  10, -1),
    run:    clip(run,    0, 3,  14, -1),
    attack: clip(attack, 0, 10, 14,  0),
  }
}

export const MONK_HEAL_EFFECT_SHEETS = {
  blue: {
    key: 'monk_blue_heal_effect',
    path: 'assets/Units/Blue Units/Monk/Heal_Effect.png',
    frameWidth: FRAME_W,
    frameHeight: FRAME_H,
    animKey: 'monk_blue_heal_effect_anim',
  },
  red: {
    key: 'monk_red_heal_effect',
    path: 'assets/Units/Red Units/Monk/Heal_Effect.png',
    frameWidth: FRAME_W,
    frameHeight: FRAME_H,
    animKey: 'monk_red_heal_effect_anim',
  },
} as const

/** Knights faction Archer — 1536×1344 combined sheet (8×7 grid @ 192px).
 *  Row 0: idle/walk down-right (0–5)   Row 1: idle/walk down-left (8–13)
 *  Row 2: death (16–23) — unused       Row 3: shoot right (24–31)
 *  Row 4: shoot down-right (32–39)     Row 5: shoot down (40–47)
 *  Row 6: shoot down-left (48–55)      Arrow releases on frame 4 of each shoot row. */
function knightsArcherSheet(side: 'Blue' | 'Red'): SheetDef {
  const prefix = side === 'Blue' ? 'blue' : 'red'
  return {
    key: `knights_archer_${prefix}_sheet`,
    path: `assets/Factions/Knights/Troops/Archer/${side}/Archer_${side}.png`,
    frameWidth: FRAME_W,
    frameHeight: FRAME_H,
  }
}

function knightsArcherSide(side: 'Blue' | 'Red'): SideAssets {
  const sheet = knightsArcherSheet(side)
  return {
    idle:            clip(sheet, 0,  5,  10, -1),
    run:             clip(sheet, 0,  5,  14, -1),
    attack:          clip(sheet, 24, 31, 14,  0),
    attackDownRight: clip(sheet, 32, 39, 14,  0),
    attackDown:      clip(sheet, 40, 47, 14,  0),
    attackDownLeft:  clip(sheet, 48, 55, 14,  0),
  }
}

const LANCER_FRAME_W = 320
const LANCER_FRAME_H = 320

function lancerAttackSheet(side: 'Blue' | 'Red', dir: 'Right' | 'Up' | 'Down'): SheetDef {
  const folder = side === 'Blue' ? 'Blue Units' : 'Red Units'
  const prefix = side === 'Blue' ? 'blue' : 'red'
  const keySuffix = dir === 'Right' ? 'attack' : `attack_${dir.toLowerCase()}`
  return {
    key: `lancer_${prefix}_${keySuffix}`,
    path: `assets/Units/${folder}/Lancer/Lancer_${dir}_Attack.png`,
    frameWidth: LANCER_FRAME_W,
    frameHeight: LANCER_FRAME_H,
  }
}

function lancerSheet(side: 'Blue' | 'Red', clip: 'idle' | 'run'): SheetDef {
  const folder = side === 'Blue' ? 'Blue Units' : 'Red Units'
  const prefix = side === 'Blue' ? 'blue' : 'red'
  const fileClip = clip === 'run' ? 'Run' : 'Idle'
  return {
    key: `lancer_${prefix}_${clip}`,
    path: `assets/Units/${folder}/Lancer/Lancer_${fileClip}.png`,
    frameWidth: LANCER_FRAME_W,
    frameHeight: LANCER_FRAME_H,
  }
}

function lancerSide(side: 'Blue' | 'Red'): SideAssets {
  const idle   = lancerSheet(side, 'idle')
  const run    = lancerSheet(side, 'run')
  const attack = lancerAttackSheet(side, 'Right')
  const attackUp = lancerAttackSheet(side, 'Up')
  const attackDown = lancerAttackSheet(side, 'Down')
  return {
    idle:   clip(idle,   0, 11, 10, -1),
    run:    clip(run,    0, 5,  14, -1),
    attack: clip(attack, 0, 2,  14,  0),
    attackUp: clip(attackUp, 0, 2, 14, 0),
    attackDown: clip(attackDown, 0, 2, 14, 0),
  }
}

function clip(sheet: SheetDef, start: number, end: number, frameRate = 8, repeat = -1): ClipDef {
  return { sheet, start, end, frameRate, repeat }
}

function clipFrames(
  sheet: SheetDef,
  frames: readonly number[],
  frameRate = 8,
  repeat = -1,
): ClipDef {
  return { sheet, start: frames[0], end: frames[frames.length - 1], frameRate, repeat, frames: [...frames] }
}

const HUMAN_AVATARS = 'assets/UI Elements/UI Elements/Human Avatars'
const ENEMY_AVATARS = 'assets/Enemy Pack/Enemy Avatars'
/** Tan parchment tile behind enemy-style card portraits (Banner_Slots.png). */
export const AVATAR_BACKDROP_BANNER: ImageDef = {
  key: 'ui_avatar_backdrop_banner',
  path: 'assets/UI Elements/UI Elements/Banners/Banner_Slots.png',
}

function humanAvatar(file: string): ImageDef {
  const stem = file.replace(/\.png$/i, '').toLowerCase()
  return { key: `avatar_${stem}`, path: `${HUMAN_AVATARS}/${file}` }
}

function enemyAvatar(file: string): ImageDef {
  const stem = file.replace(/\.png$/i, '').replace(/\s+/g, '_').toLowerCase()
  return { key: `avatar_${stem}`, path: `${ENEMY_AVATARS}/${file}` }
}

/** Reserved enemy portraits (no card wired yet): _07 snake, _11 spider, _14, _15 gnome. */

export const PIRATE_TOWER_PATH = 'assets/Enemy Pack/Enemies/Pirate Fish/Pirate Tower'
export const PIRATE_TOWER_GROUND = `${PIRATE_TOWER_PATH}/Pirate Tower_Ground.png`
export const PIRATE_TOWER_FRAME = { width: 128, height: 192 } as const

const ICON_FRAME = 64

function iconOnlySide(key: string, path: string): SideAssets {
  const sheet: SheetDef = { key, path, frameWidth: ICON_FRAME, frameHeight: ICON_FRAME }
  const frame = clip(sheet, 0, 0, 1, -1)
  return { idle: frame, run: frame, attack: frame }
}

function staticImageSide(key: string, path: string, frameWidth: number, frameHeight: number): SideAssets {
  const sheet: SheetDef = { key, path, frameWidth, frameHeight }
  const frame = clip(sheet, 0, 0, 1, -1)
  return { idle: frame, run: frame, attack: frame }
}

function pirateTowerSide(cardId: string, side: 'blue' | 'red'): SideAssets {
  return staticImageSide(
    `${cardId}_${side}_idle`,
    PIRATE_TOWER_GROUND,
    PIRATE_TOWER_FRAME.width,
    PIRATE_TOWER_FRAME.height,
  )
}

const TORCH_GOBLIN_PATH = 'assets/Enemy Pack/Enemies/Goblin Raiders/Torch Goblin'
const HEX_SHAMAN_PATH = 'assets/Enemy Pack/Enemies/Goblin Raiders/Hex Shaman'
const HEX_FX_FRAME = 128

export const HEX_SHAMAN_PROJECTILE_SHEET = {
  key: 'hex_shaman_projectile',
  path: `${HEX_SHAMAN_PATH}/Hex Shaman_Projectile.png`,
  frameWidth: HEX_FX_FRAME,
  frameHeight: HEX_FX_FRAME,
} as const

export const HEX_SHAMAN_EXPLOSION_SHEET = {
  key: 'hex_shaman_explosion',
  path: `${HEX_SHAMAN_PATH}/Hex Shaman_Explosion.png`,
  frameWidth: HEX_FX_FRAME,
  frameHeight: HEX_FX_FRAME,
} as const

const BARREL_PATH = 'assets/Factions/Goblins/Troops/Barrel'
const BARREL_FRAME = 192

const TNT_PATH = 'assets/Factions/Goblins/Troops/TNT'
const TNT_FRAME = FRAME_W

export const GOBLIN_DYNAMITE_SHEET = {
  key: 'goblin_dynamite',
  path: `${TNT_PATH}/Dynamite/Dynamite.png`,
  frameWidth: 64,
  frameHeight: 64,
  frameEnd: 5,
  frameRate: 12,
  animKey: 'goblin_dynamite_spin',
} as const

export const AVATAR_GOBLIN_DEMOLISHER_KEY = 'avatar_goblin_demolisher'

function goblinDemolisherSheet(side: 'Blue' | 'Red'): SheetDef {
  return {
    key: `goblin_demolisher_${side.toLowerCase()}_sheet`,
    path: `${TNT_PATH}/${side}/TNT_${side}.png`,
    frameWidth: TNT_FRAME,
    frameHeight: TNT_FRAME,
  }
}

/** Factions TNT goblin — rows 0–1 walk (6+6f; cols 7 empty), row 2 place dynamite (7f). */
const TNT_RUN_FRAMES = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12] as const

function goblinDemolisherSide(side: 'Blue' | 'Red'): SideAssets {
  const sheet = goblinDemolisherSheet(side)
  return {
    idle:   clip(sheet, 0,  0,  10, -1),
    run:    clipFrames(sheet, TNT_RUN_FRAMES, 14, -1),
    attack: clip(sheet, 14, 20,  14,  0),
  }
}

export const BARREL_BLUE_KEY = 'barrel_blue'
export const BARREL_RED_KEY = 'barrel_red'
export const AVATAR_GOBLIN_BARREL_KEY = 'avatar_goblin_barrel'

function barrelSheet(side: 'Blue' | 'Red'): SheetDef {
  return {
    key: `barrel_${side.toLowerCase()}`,
    path: `${BARREL_PATH}/${side}/Barrel_${side}.png`,
    frameWidth: BARREL_FRAME,
    frameHeight: BARREL_FRAME,
  }
}

function barrelSide(side: 'Blue' | 'Red'): SideAssets {
  const sheet = barrelSheet(side)
  // 4×4 sheet: frame 0 rest, 1-7 hop-in, 12-14 crack-open (play once).
  return {
    idle: clip(sheet, 0, 0, 1, -1),
    run: clip(sheet, 1, 7),
    attack: clip(sheet, 12, 14, 8, 0),
  }
}

const BOMB_PATH = 'assets/Enemy Pack/Enemies/Pirate Fish/Bomb'
const BOMB_FRAME = 128

function bombSheet(suffix: string, file: string): SheetDef {
  return {
    key: `bomb_${suffix}`,
    path: `${BOMB_PATH}/${file}`,
    frameWidth: BOMB_FRAME,
    frameHeight: BOMB_FRAME,
  }
}

function bombSide(): SideAssets {
  const idle     = bombSheet('idle',     'Bomb_Idle.png')
  const spinning = bombSheet('spinning', 'Bomb_Spinning.png')
  const fuseLit  = bombSheet('fuse_lit', 'Bomb_FuseLit.png')
  return {
    idle:   clip(idle,     0, 0, 10, -1),
    run:    clip(spinning, 0, 3, 14, -1),
    attack: clip(fuseLit,  0, 3, 12,  0),
  }
}

/** Enemy Pack Torch Goblin — separate clips per anim (matches card avatar). */
function torchGoblinSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `torch_goblin_${side}_idle`,
    path: `${TORCH_GOBLIN_PATH}/Torch Goblin_Idle.png`,
  }
  const run: SheetDef = {
    key: `torch_goblin_${side}_run`,
    path: `${TORCH_GOBLIN_PATH}/Torch Goblin_Run.png`,
  }
  const attack: SheetDef = {
    key: `torch_goblin_${side}_attack`,
    path: `${TORCH_GOBLIN_PATH}/Torch Goblin_Attack.png`,
  }
  return {
    idle:   clip(idle,   0, 7, 10, -1),
    run:    clip(run,    0, 5, 14, -1),
    attack: clip(attack, 0, 7, 14,  0),
  }
}

const SKULL_PATH = 'assets/Enemy Pack/Enemies/Skull'

/** Enemy Pack Skull — separate clips per anim; Guard sheet unused (block pose only). */
function skullSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `skeleton_${side}_idle`,
    path: `${SKULL_PATH}/Skull_Idle.png`,
  }
  const run: SheetDef = {
    key: `skeleton_${side}_run`,
    path: `${SKULL_PATH}/Skull_Run.png`,
  }
  const attack: SheetDef = {
    key: `skeleton_${side}_attack`,
    path: `${SKULL_PATH}/Skull_Attack.png`,
  }
  return {
    idle:   clip(idle,   0, 7, 10, -1),
    run:    clip(run,    0, 5, 14, -1),
    attack: clip(attack, 0, 6, 14,  0),
  }
}

const SPEAR_GOBLIN_PATH = 'assets/Enemy Pack/Enemies/Goblin Raiders/Spear Goblin'
const SPEAR_GOBLIN_FRAME = 256

function villagersSheet(side: 'Blue' | 'Red', clip: 'idle' | 'run' | 'attack'): SheetDef {
  const folder = side === 'Blue' ? 'Blue Units' : 'Red Units'
  const prefix = side === 'Blue' ? 'blue' : 'red'
  const file = clip === 'idle' ? 'Pawn_Idle.png'
    : clip === 'run' ? 'Pawn_Run.png'
    : 'Pawn_Interact Knife.png'
  return {
    key: `villagers_${prefix}_${clip}`,
    path: `assets/Units/${folder}/Pawn/${file}`,
    frameWidth: FRAME_W,
    frameHeight: FRAME_H,
  }
}

/** Hooded villager art — Villagers card (melee ×3). Knife interact clip = stab. */
function villagersSide(side: 'Blue' | 'Red'): SideAssets {
  const idle   = villagersSheet(side, 'idle')
  const run    = villagersSheet(side, 'run')
  const attack = villagersSheet(side, 'attack')
  return {
    idle:   clip(idle,   0, 7, 10, -1),
    run:    clip(run,    0, 5, 14, -1),
    attack: clip(attack, 0, 3, 14,  0),
  }
}

/** Enemy Pack Spear Goblin — ×3 melee with armor. */
function spearGoblinSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `spear_goblin_${side}_idle`,
    path: `${SPEAR_GOBLIN_PATH}/Spear Goblin_Idle.png`,
    frameWidth: SPEAR_GOBLIN_FRAME,
    frameHeight: SPEAR_GOBLIN_FRAME,
  }
  const run: SheetDef = {
    key: `spear_goblin_${side}_run`,
    path: `${SPEAR_GOBLIN_PATH}/Spear Goblin_Run.png`,
    frameWidth: SPEAR_GOBLIN_FRAME,
    frameHeight: SPEAR_GOBLIN_FRAME,
  }
  const attack: SheetDef = {
    key: `spear_goblin_${side}_attack`,
    path: `${SPEAR_GOBLIN_PATH}/Spear Goblin_Attack Strong.png`,
    frameWidth: SPEAR_GOBLIN_FRAME,
    frameHeight: SPEAR_GOBLIN_FRAME,
  }
  return {
    idle:   clip(idle,   0, 7, 10, -1),
    run:    clip(run,    0, 5, 14, -1),
    attack: clip(attack, 0, 7, 14,  0),
  }
}

const LIZARD_PATH = 'assets/Enemy Pack/Enemies/Caveborn/Lizard'

function lizardSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `lizard_${side}_idle`,
    path: `${LIZARD_PATH}/Lizard_Idle_Flying.png`,
  }
  const attack: SheetDef = {
    key: `lizard_${side}_attack`,
    path: `${LIZARD_PATH}/Lizard_Attack_Flying.png`,
  }
  return {
    idle:   clip(idle, 0, 6, 10, -1),
    run:    clip(idle, 0, 6, 14, -1),
    attack: clip(attack, 0, 8, 14,  0),
  }
}

const AIR_BOAT_PATH = 'assets/Enemy Pack/Enemies/Pirate Fish/Boat'
const AIR_BOAT_FRAME = 256

function airBoatSide(side: 'blue' | 'red'): SideAssets {
  const sheet: SheetDef = {
    key: `air_boat_${side}_idle`,
    path: `${AIR_BOAT_PATH}/AirBoat_Idle.png`,
    frameWidth: AIR_BOAT_FRAME,
    frameHeight: AIR_BOAT_FRAME,
  }
  return {
    idle:   clip(sheet, 0, 7, 8, -1),
    run:    clip(sheet, 0, 7, 8, -1),
    attack: clip(sheet, 0, 7, 8, -1),
  }
}

const PIG_PATH = 'assets/Enemy Pack/Enemies/Goblin Raiders/Pig'
const PIG_FRAME = 192

/** Enemy Pack Pig — 192×192 frames (native sheet resolution); no attack sheet — run reused. */
function pigSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `pig_${side}_idle`,
    path: `${PIG_PATH}/Pig_Idle.png`,
    frameWidth: PIG_FRAME,
    frameHeight: PIG_FRAME,
  }
  const run: SheetDef = {
    key: `pig_${side}_run`,
    path: `${PIG_PATH}/Pig_Run.png`,
    frameWidth: PIG_FRAME,
    frameHeight: PIG_FRAME,
  }
  const runAttack = clip(run, 0, 3, 14, 0)
  return {
    idle:   clip(idle, 0, 9,  8, -1),
    run:    clip(run,  0, 3, 14, -1),
    attack: runAttack,
  }
}

const PIG_RIDER_PATH = 'assets/Enemy Pack/Enemies/Goblin Raiders/Pig Rider Spear Goblin'
const PIG_RIDER_FRAME = 256

/** Enemy Pack Pig Rider Spear Goblin — 256×256 frames. */
function pigRiderSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `pig_rider_${side}_idle`,
    path: `${PIG_RIDER_PATH}/Pig Rider_Idle.png`,
    frameWidth: PIG_RIDER_FRAME,
    frameHeight: PIG_RIDER_FRAME,
  }
  const run: SheetDef = {
    key: `pig_rider_${side}_run`,
    path: `${PIG_RIDER_PATH}/Pig Rider_Run.png`,
    frameWidth: PIG_RIDER_FRAME,
    frameHeight: PIG_RIDER_FRAME,
  }
  const attack: SheetDef = {
    key: `pig_rider_${side}_attack`,
    path: `${PIG_RIDER_PATH}/Pig Rider_Attack.png`,
    frameWidth: PIG_RIDER_FRAME,
    frameHeight: PIG_RIDER_FRAME,
  }
  return {
    idle:   clip(idle,   0, 7, 10, -1),
    run:    clip(run,    0, 3, 14, -1),
    attack: clip(attack, 0, 6, 14,  0),
  }
}

const BOMB_FISH_PATH = 'assets/Enemy Pack/Enemies/Pirate Fish/Bomb Fish'
const BOMB_FISH_FRAME = 192

/** Enemy Pack Bomb Fish — Shoot sheet used as attack. */
function bombFishSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `bomb_fish_${side}_idle`,
    path: `${BOMB_FISH_PATH}/Bomb Fish_Idle.png`,
    frameWidth: BOMB_FISH_FRAME,
    frameHeight: BOMB_FISH_FRAME,
  }
  const run: SheetDef = {
    key: `bomb_fish_${side}_run`,
    path: `${BOMB_FISH_PATH}/Bomb Fish_Run.png`,
    frameWidth: BOMB_FISH_FRAME,
    frameHeight: BOMB_FISH_FRAME,
  }
  const attack: SheetDef = {
    key: `bomb_fish_${side}_attack`,
    path: `${BOMB_FISH_PATH}/Bomb Fish_Shoot.png`,
    frameWidth: BOMB_FISH_FRAME,
    frameHeight: BOMB_FISH_FRAME,
  }
  return {
    idle:   clip(idle,   0, 7, 10, -1),
    run:    clip(run,    0, 5, 14, -1),
    attack: clip(attack, 0, 6, 14,  0),
  }
}

const MINOTAUR_PATH = 'assets/Enemy Pack/Enemies/Minotaur'
const MINOTAUR_FRAME = 320

/** Enemy Pack Minotaur — 320×320 frames; Guard sheet unused. */
function minotaurSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `minotaur_${side}_idle`,
    path: `${MINOTAUR_PATH}/Minotaur_Idle.png`,
    frameWidth: MINOTAUR_FRAME,
    frameHeight: MINOTAUR_FRAME,
  }
  const run: SheetDef = {
    key: `minotaur_${side}_run`,
    path: `${MINOTAUR_PATH}/Minotaur_Walk.png`,
    frameWidth: MINOTAUR_FRAME,
    frameHeight: MINOTAUR_FRAME,
  }
  const attack: SheetDef = {
    key: `minotaur_${side}_attack`,
    path: `${MINOTAUR_PATH}/Minotaur_Attack.png`,
    frameWidth: MINOTAUR_FRAME,
    frameHeight: MINOTAUR_FRAME,
  }
  return {
    idle:   clip(idle,   0, 15,  8, -1),
    run:    clip(run,    0,  7, 10, -1),
    attack: clip(attack, 0, 11, 12,  0),
  }
}

const THIEF_PATH = 'assets/Enemy Pack/Enemies/Thief'
const THIEF_FRAME = 192

const GNOLL_PATH = 'assets/Enemy Pack/Enemies/Gnoll'

const PADDLE_SHARK_PATH = 'assets/Enemy Pack/Enemies/Pirate Fish/Paddle Shark'

export const PADDLE_SHARK_IDLE_SHEET = {
  key: 'paddle_shark_idle',
  path: `${PADDLE_SHARK_PATH}/Paddle Shark_Idle.png`,
  frameWidth: 192,
  frameHeight: 192,
  animKey: 'paddle_shark_idle_anim',
  frameStart: 0,
  frameEnd: 7,
  frameRate: 10,
}

export const PADDLE_SHARK_ROW_SHEET = {
  key: 'paddle_shark_row',
  path: `${PADDLE_SHARK_PATH}/Paddle Shark_Row.png`,
  frameWidth: 192,
  frameHeight: 192,
  animKey: 'paddle_shark_row_anim',
  frameStart: 0,
  frameEnd: 6,
  frameRate: 12,
}

export const GNOLL_BONE_SHEET = {
  key: 'gnoll_bone',
  path: `${GNOLL_PATH}/Gnoll_Bone.png`,
  frameWidth: 64,
  frameHeight: 64,
  animKey: 'gnoll_bone_spin',
  frameStart: 0,
  frameEnd: 3,
  frameRate: 14,
}

/** Enemy Pack Gnoll — boomerang bone thrower. */
function gnollSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `gnoll_${side}_idle`,
    path: `${GNOLL_PATH}/Gnoll_Idle.png`,
  }
  const run: SheetDef = {
    key: `gnoll_${side}_run`,
    path: `${GNOLL_PATH}/Gnoll_Walk.png`,
  }
  const attack: SheetDef = {
    key: `gnoll_${side}_attack`,
    path: `${GNOLL_PATH}/Gnoll_Throw.png`,
  }
  return {
    idle:   clip(idle,   0, 5, 10, -1),
    run:    clip(run,    0, 7, 14, -1),
    attack: clip(attack, 0, 7, 14,  0),
  }
}

const HARPOON_SHARK_PATH = 'assets/Enemy Pack/Enemies/Pirate Fish/Harpoon Shark'
const HARPOON_SHARK_FRAME = 192

export const HARPOON_PROJECTILE_SHEET = {
  key: 'harpoon_projectile',
  path: `${HARPOON_SHARK_PATH}/Harpoon.png`,
  frameWidth: 64,
  frameHeight: 64,
} as const

/** Enemy Pack Harpoon Shark — fisherman-style hook thrower. */
function harpoonSharkSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `harpoon_shark_${side}_idle`,
    path: `${HARPOON_SHARK_PATH}/Harpoon Shark_Idle.png`,
    frameWidth: HARPOON_SHARK_FRAME,
    frameHeight: HARPOON_SHARK_FRAME,
  }
  const run: SheetDef = {
    key: `harpoon_shark_${side}_run`,
    path: `${HARPOON_SHARK_PATH}/Harpoon Shark_Run.png`,
    frameWidth: HARPOON_SHARK_FRAME,
    frameHeight: HARPOON_SHARK_FRAME,
  }
  const attack: SheetDef = {
    key: `harpoon_shark_${side}_attack`,
    path: `${HARPOON_SHARK_PATH}/Harpoon Shark_Throw.png`,
    frameWidth: HARPOON_SHARK_FRAME,
    frameHeight: HARPOON_SHARK_FRAME,
  }
  return {
    idle:   clip(idle,   0, 7, 10, -1),
    run:    clip(run,    0, 5, 14, -1),
    attack: clip(attack, 0, 7, 14,  0),
  }
}

/** Enemy Pack Thief — 192×192 frames. */
function thiefSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `thief_${side}_idle`,
    path: `${THIEF_PATH}/Thief_Idle.png`,
    frameWidth: THIEF_FRAME,
    frameHeight: THIEF_FRAME,
  }
  const run: SheetDef = {
    key: `thief_${side}_run`,
    path: `${THIEF_PATH}/Thief_Run.png`,
    frameWidth: THIEF_FRAME,
    frameHeight: THIEF_FRAME,
  }
  const attack: SheetDef = {
    key: `thief_${side}_attack`,
    path: `${THIEF_PATH}/Thief_Attack.png`,
    frameWidth: THIEF_FRAME,
    frameHeight: THIEF_FRAME,
  }
  return {
    idle:   clip(idle,   0, 5, 10, -1),
    run:    clip(run,    0, 5, 14, -1),
    attack: clip(attack, 0, 5, 14,  0),
  }
}

const PANDA_PATH = 'assets/Enemy Pack/Enemies/Panda'
const PANDA_FRAME = 256

/** Enemy Pack Panda — 256×256 frames; Guard sheet unused. */
function pandaSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `panda_${side}_idle`,
    path: `${PANDA_PATH}/Panda_Idle.png`,
    frameWidth: PANDA_FRAME,
    frameHeight: PANDA_FRAME,
  }
  const run: SheetDef = {
    key: `panda_${side}_run`,
    path: `${PANDA_PATH}/Panda_Run.png`,
    frameWidth: PANDA_FRAME,
    frameHeight: PANDA_FRAME,
  }
  const attack: SheetDef = {
    key: `panda_${side}_attack`,
    path: `${PANDA_PATH}/Panda_Attack.png`,
    frameWidth: PANDA_FRAME,
    frameHeight: PANDA_FRAME,
  }
  return {
    idle:   clip(idle,   0,  9, 10, -1),
    run:    clip(run,    0,  5, 14, -1),
    attack: clip(attack, 0, 12, 14,  0),
  }
}

const TURTLE_PATH = 'assets/Enemy Pack/Enemies/Caveborn/Turtle'
const TURTLE_FRAME = 320

/** Enemy Pack Turtle — 320×320 frames; Guard sheets unused. */
function turtleSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `turtle_${side}_idle`,
    path: `${TURTLE_PATH}/Turtle_Idle.png`,
    frameWidth: TURTLE_FRAME,
    frameHeight: TURTLE_FRAME,
  }
  const run: SheetDef = {
    key: `turtle_${side}_run`,
    path: `${TURTLE_PATH}/Turtle_Walk.png`,
    frameWidth: TURTLE_FRAME,
    frameHeight: TURTLE_FRAME,
  }
  const attack: SheetDef = {
    key: `turtle_${side}_attack`,
    path: `${TURTLE_PATH}/Turtle_Attack.png`,
    frameWidth: TURTLE_FRAME,
    frameHeight: TURTLE_FRAME,
  }
  return {
    idle:   clip(idle,   0,  9,  8, -1),
    run:    clip(run,    0,  6, 10, -1),
    attack: clip(attack, 0,  9, 12,  0),
  }
}

const BEAR_PATH = 'assets/Enemy Pack/Enemies/Caveborn/Bear'
const BEAR_FRAME = 256

/** Caveborn Bear — Mega Knight rules (7 elixir ground splash melee). */
function bearTroopSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `bear_${side}_idle`,
    path: `${BEAR_PATH}/Bear_Idle.png`,
    frameWidth: BEAR_FRAME,
    frameHeight: BEAR_FRAME,
  }
  const run: SheetDef = {
    key: `bear_${side}_run`,
    path: `${BEAR_PATH}/Bear_Run.png`,
    frameWidth: BEAR_FRAME,
    frameHeight: BEAR_FRAME,
  }
  const attack: SheetDef = {
    key: `bear_${side}_attack`,
    path: `${BEAR_PATH}/Bear_Attack.png`,
    frameWidth: BEAR_FRAME,
    frameHeight: BEAR_FRAME,
  }
  return {
    idle:   clip(idle,   0, 7,  8, -1),
    run:    clip(run,    0, 4, 14, -1),
    attack: clip(attack, 0, 8, 12,  0),
  }
}

const SPIDER_PATH = 'assets/Enemy Pack/Enemies/Caveborn/Spider'
const SPIDER_FRAME = 192

/** Enemy Pack Spider — Witch-style spawner; shared art for spiderling minions. */
function spiderSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `spider_${side}_idle`,
    path: `${SPIDER_PATH}/Spider_Idle.png`,
    frameWidth: SPIDER_FRAME,
    frameHeight: SPIDER_FRAME,
  }
  const run: SheetDef = {
    key: `spider_${side}_run`,
    path: `${SPIDER_PATH}/Spider_Run.png`,
    frameWidth: SPIDER_FRAME,
    frameHeight: SPIDER_FRAME,
  }
  const attack: SheetDef = {
    key: `spider_${side}_attack`,
    path: `${SPIDER_PATH}/Spider_Attack.png`,
    frameWidth: SPIDER_FRAME,
    frameHeight: SPIDER_FRAME,
  }
  return {
    idle:   clip(idle,   0, 7, 10, -1),
    run:    clip(run,    0, 4, 14, -1),
    attack: clip(attack, 0, 7, 14,  0),
  }
}

const TROLL_PATH = 'assets/Enemy Pack/Enemies/Troll'
const TROLL_FRAME = 384

/** Enemy Pack Troll — 384×384 frames; Windup/Recovery/Dead sheets unused. */
function trollSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `troll_${side}_idle`,
    path: `${TROLL_PATH}/Troll_Idle.png`,
    frameWidth: TROLL_FRAME,
    frameHeight: TROLL_FRAME,
  }
  const run: SheetDef = {
    key: `troll_${side}_run`,
    path: `${TROLL_PATH}/Troll_Walk.png`,
    frameWidth: TROLL_FRAME,
    frameHeight: TROLL_FRAME,
  }
  const attack: SheetDef = {
    key: `troll_${side}_attack`,
    path: `${TROLL_PATH}/Troll_Attack.png`,
    frameWidth: TROLL_FRAME,
    frameHeight: TROLL_FRAME,
  }
  return {
    idle:   clip(idle,   0, 11,  8, -1),
    run:    clip(run,    0,  9, 10, -1),
    attack: clip(attack, 0,  5, 12,  0),
  }
}

/** Enemy Pack Hex Shaman — single palette; blue/red keys share the same art. */
function hexShamanSide(side: 'blue' | 'red'): SideAssets {
  const idle: SheetDef = {
    key: `wizard_${side}_idle`,
    path: `${HEX_SHAMAN_PATH}/Hex Shaman_Idle.png`,
  }
  const run: SheetDef = {
    key: `wizard_${side}_run`,
    path: `${HEX_SHAMAN_PATH}/Hex Shaman_Run.png`,
  }
  const attack: SheetDef = {
    key: `wizard_${side}_attack`,
    path: `${HEX_SHAMAN_PATH}/Hex Shaman_Attack.png`,
  }
  return {
    idle:   clip(idle,   0, 7, 10, -1),
    run:    clip(run,    0, 3, 14, -1),
    attack: clip(attack, 0, 9, 14,  0),
  }
}

export const BOT_SIDE_TINT = 0xff9999

export function usesTintedBotSide(cardId: string): boolean {
  return CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)?.tintBotSide === true
}

export const CARD_ASSET_BUNDLES: CardAssetBundle[] = [
  {
    cardId: 'warrior',
    avatar: humanAvatar('Avatars_01.png'),
    avatarHandScale: 0.88,
    contentFill: 0.52,
    attackHitFrame: 2,
    player: knightSide('Warrior', 'Blue'),
    bot:    knightSide('Warrior', 'Red'),
  },
  {
    cardId: 'archer',
    avatar: {
      key: 'avatar_knights_archer',
      path: 'assets/Factions/Knights/Troops/Archer/Archer + Bow/Archer_Blue_(NoArms).png',
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      frame: 0,
    },
    avatarCropRatio: 0.42,
    contentFill: 0.50,
    attackHitFrame: 27,
    player: knightsArcherSide('Blue'),
    bot:    knightsArcherSide('Red'),
  },
  {
    cardId: 'elite_archer',
    avatar: humanAvatar('Avatars_03.png'),
    contentFill: 0.50,
    attackHitFrame: 5,
    player: knightSide('Archer', 'Blue'),
    bot:    knightSide('Archer', 'Red'),
  },
  {
    cardId: 'lancer',
    avatar: humanAvatar('Avatars_02.png'),
    contentFill: 0.30,
    attackHitFrame: 2,
    player: lancerSide('Blue'),
    bot:    lancerSide('Red'),
  },
  {
    cardId: 'skeleton',
    avatar: enemyAvatar('Enemy Avatars_01.png'),
    contentFill: 0.55,
    attackHitFrame: 4,
    tintBotSide: true,
    player: skullSide('blue'),
    bot:    skullSide('red'),
  },
  {
    cardId: 'skeleton_army',
    avatar: {
      key: 'avatar_skeleton_army',
      path: `${SKULL_PATH}/Skull_Idle.png`,
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
      frame: 0,
    },
    avatarBackdrop: AVATAR_BACKDROP_BANNER,
    avatarSwarmSourceCardId: 'skeleton',
    contentFill: 0.55,
    attackHitFrame: 4,
    tintBotSide: true,
    player: skullSide('blue'),
    bot:    skullSide('red'),
  },
  {
    cardId: 'troll',
    avatar: enemyAvatar('Enemy Avatars_16.png'),
    contentFill: 0.48,
    attackHitFrame: 4,
    tintBotSide: true,
    player: trollSide('blue'),
    bot:    trollSide('red'),
  },
  {
    cardId: 'spear_goblin',
    avatar: { key: 'avatar_spear_goblin', path: `${ENEMY_AVATARS}/Spear Goblin.png` },
    avatarCropRatio: 0.55,
    contentFill: 0.55,
    attackHitFrame: 4,
    tintBotSide: true,
    player: spearGoblinSide('blue'),
    bot:    spearGoblinSide('red'),
  },
  {
    cardId: 'villagers',
    avatar: { key: 'avatar_villagers', path: `${HUMAN_AVATARS}/Avatars_05.png` },
    contentFill: 0.52,
    attackHitFrame: 2,
    player: villagersSide('Blue'),
    bot:    villagersSide('Red'),
  },
  {
    cardId: 'torch_goblin',
    avatar: enemyAvatar('Torch Goblin.png'),
    avatarCropRatio: 0.65,
    contentFill: 0.55,
    attackHitFrame: 3,
    tintBotSide: true,
    player: torchGoblinSide('blue'),
    bot:    torchGoblinSide('red'),
  },
  {
    cardId: 'wizard',
    avatar: enemyAvatar('Hex Shaman.png'),
    avatarCropRatio: 0.72,
    contentFill: 0.55,
    attackHitFrame: 6,
    tintBotSide: true,
    player: hexShamanSide('blue'),
    bot:    hexShamanSide('red'),
  },
  {
    cardId: 'lizard',
    avatar: enemyAvatar('Enemy Avatars_13.png'),
    avatarCropRatio: 0.65,
    contentFill: 0.55,
    attackHitFrame: 5,
    tintBotSide: true,
    player: lizardSide('blue'),
    bot:    lizardSide('red'),
  },
  {
    cardId: 'air_boat',
    avatar: {
      key: 'avatar_air_boat',
      path: `${AIR_BOAT_PATH}/AirBoat_Idle.png`,
      frameWidth: AIR_BOAT_FRAME,
      frameHeight: AIR_BOAT_FRAME,
      frame: 0,
    },
    avatarBackdrop: AVATAR_BACKDROP_BANNER,
    avatarCropRatio: 0.70,
    // Centre the crop on the hull opening.
    avatarFocusY: 0.82,
    // Lower fill scales balloon + hull up on-map; crew use standard troop size in AirBoatCrew.
    contentFill: 0.42,
    useEditorCompositeAvatar: true,
    spriteOriginY: 1.28,
    attackHitFrame: 4,
    tintBotSide: true,
    player: airBoatSide('blue'),
    bot:    airBoatSide('red'),
  },
  {
    cardId: 'bear',
    avatar: {
      key: 'avatar_bear',
      path: `${BEAR_PATH}/Bear_Idle.png`,
      frameWidth: BEAR_FRAME,
      frameHeight: BEAR_FRAME,
      frame: 0,
    },
    avatarBackdrop: AVATAR_BACKDROP_BANNER,
    avatarCropRatio: 0.55,
    contentFill: 0.50,
    attackHitFrame: 4,
    tintBotSide: true,
    player: bearTroopSide('blue'),
    bot:    bearTroopSide('red'),
  },
  {
    cardId: 'pig_rider',
    avatar: enemyAvatar('Pig Rider.png'),
    avatarCropRatio: 0.62,
    contentFill: 0.52,
    attackHitFrame: 4,
    tintBotSide: true,
    player: pigRiderSide('blue'),
    bot:    pigRiderSide('red'),
  },
  {
    cardId: 'pig',
    avatar: {
      key: 'avatar_pig',
      path: `${PIG_PATH}/Pig_Idle.png`,
      frameWidth: PIG_FRAME,
      frameHeight: PIG_FRAME,
      frame: 0,
    },
    avatarBackdrop: AVATAR_BACKDROP_BANNER,
    avatarCropRatio: 0.55,
    contentFill: 0.50,
    attackHitFrame: 2,
    tintBotSide: true,
    player: pigSide('blue'),
    bot:    pigSide('red'),
  },
  {
    cardId: 'bomb_fish',
    avatar: enemyAvatar('Bomb Fish.png'),
    avatarCropRatio: 0.65,
    contentFill: 0.55,
    attackHitFrame: 4,
    tintBotSide: true,
    player: bombFishSide('blue'),
    bot:    bombFishSide('red'),
  },
  {
    cardId: 'goblin_demolisher',
    avatar: {
      key: AVATAR_GOBLIN_DEMOLISHER_KEY,
      path: `${TNT_PATH}/Blue/TNT_Blue.png`,
      frameWidth: TNT_FRAME,
      frameHeight: TNT_FRAME,
      frame: 0,
    },
    contentFill: 0.55,
    attackHitFrame: 17,
    player: goblinDemolisherSide('Blue'),
    bot:    goblinDemolisherSide('Red'),
  },
  {
    cardId: 'minotaur',
    avatar: enemyAvatar('Enemy Avatars_09.png'),
    avatarCropRatio: 0.58,
    contentFill: 0.46,
    attackHitFrame: 5,
    tintBotSide: true,
    player: minotaurSide('blue'),
    bot:    minotaurSide('red'),
  },
  {
    cardId: 'gnoll',
    avatar: enemyAvatar('Enemy Avatars_10.png'),
    avatarCropRatio: 0.58,
    contentFill: 0.55,
    attackHitFrame: 4,
    tintBotSide: true,
    player: gnollSide('blue'),
    bot:    gnollSide('red'),
  },
  {
    cardId: 'thief',
    avatar: enemyAvatar('Enemy Avatars_06.png'),
    avatarCropRatio: 0.62,
    contentFill: 0.55,
    attackHitFrame: 3,
    tintBotSide: true,
    player: thiefSide('blue'),
    bot:    thiefSide('red'),
  },
  {
    cardId: 'turtle',
    avatar: enemyAvatar('Enemy Avatars_08.png'),
    avatarCropRatio: 0.58,
    contentFill: 0.50,
    attackHitFrame: 5,
    tintBotSide: true,
    player: turtleSide('blue'),
    bot:    turtleSide('red'),
  },
  {
    cardId: 'panda',
    avatar: enemyAvatar('Enemy Avatars_12.png'),
    avatarCropRatio: 0.58,
    contentFill: 0.37,
    attackHitFrame: 6,
    tintBotSide: true,
    player: pandaSide('blue'),
    bot:    pandaSide('red'),
  },
  {
    cardId: 'monk',
    avatar: humanAvatar('Avatars_04.png'),
    contentFill: 0.52,
    attackHitFrame: 5,
    player: monkSide('Blue'),
    bot:    monkSide('Red'),
  },
  {
    cardId: 'harpoon_shark',
    avatar: { key: 'avatar_harpoon_shark', path: `${ENEMY_AVATARS}/Harpoon Shark.png` },
    avatarCropRatio: 0.55,
    contentFill: 0.52,
    attackHitFrame: 4,
    tintBotSide: true,
    player: harpoonSharkSide('blue'),
    bot:    harpoonSharkSide('red'),
  },
  {
    cardId: 'spider',
    avatar: enemyAvatar('Enemy Avatars_11.png'),
    avatarCropRatio: 0.58,
    contentFill: 0.52,
    attackHitFrame: 4,
    tintBotSide: true,
    player: spiderSide('blue'),
    bot:    spiderSide('red'),
  },
  {
    cardId: 'spiderling',
    avatar: {
      key: 'avatar_spiderling',
      path: `${SPIDER_PATH}/Spider_Idle.png`,
      frameWidth: SPIDER_FRAME,
      frameHeight: SPIDER_FRAME,
      frame: 0,
    },
    contentFill: 0.82,
    attackHitFrame: 4,
    tintBotSide: true,
    player: spiderSide('blue'),
    bot:    spiderSide('red'),
  },
  {
    cardId: 'arrows',
    avatar: { key: 'arrow_blue', path: 'assets/Units/Blue Units/Archer/Arrow.png' },
    animated: false,
    contentFill: 0.85,
    player: iconOnlySide('arrow_blue', 'assets/Units/Blue Units/Archer/Arrow.png'),
    bot:    iconOnlySide('arrow_red',  'assets/Units/Red Units/Archer/Arrow.png'),
  },
  {
    cardId: 'wood_tower',
    avatar: {
      key: 'avatar_bomb_tower',
      path: PIRATE_TOWER_GROUND,
      frameWidth: PIRATE_TOWER_FRAME.width,
      frameHeight: PIRATE_TOWER_FRAME.height,
      frame: 0,
    },
    avatarBuildingFit: true,
    avatarHandScale: 0.92,
    useEditorCompositeAvatar: true,
    animated: false,
    contentFill: 0.72,
    tintBotSide: true,
    player: pirateTowerSide('wood_tower', 'blue'),
    bot:    pirateTowerSide('wood_tower', 'red'),
  },
  {
    cardId: 'tnt',
    avatar: { key: 'avatar_bomb_idle', path: `${BOMB_PATH}/Bomb_Idle.png` },
    avatarBackdrop: AVATAR_BACKDROP_BANNER,
    contentFill: 0.82,
    player: bombSide(),
    bot:    bombSide(),
  },
  {
    cardId: 'goblin_barrel',
    avatar: {
      key: AVATAR_GOBLIN_BARREL_KEY,
      path: `${BARREL_PATH}/Blue/Barrel_Blue.png`,
      frameWidth: BARREL_FRAME,
      frameHeight: BARREL_FRAME,
      frame: 0,
    },
    avatarBackdrop: AVATAR_BACKDROP_BANNER,
    avatarHandScale: 0.82,
    contentFill: 0.80,
    player: barrelSide('Blue'),
    bot:    barrelSide('Red'),
  },
]

export type AnimClip = 'idle' | 'run' | 'attack'
export type AttackAnimVariant = 'up' | 'down' | 'down_right' | 'down_left'

export function clipAnimKey(
  cardId: string,
  owner: Owner,
  anim: AnimClip,
  variant?: AttackAnimVariant,
): string {
  const side = owner === Owner.PLAYER ? 'blue' : 'red'
  if (anim === 'attack' && variant) return `${cardId}_${side}_attack_${variant}`
  return `${cardId}_${side}_${anim}`
}

/** Pick attack clip from aim vector — lancer up/down, knights archer 4-way shoot. */
export function resolveAttackClip(
  cardId: string,
  owner: Owner,
  fromX: number,
  fromY: number,
  aimX: number,
  aimY: number,
): { clip: ClipDef; flipX: boolean } | null {
  const side = getSideAssets(cardId, owner)
  if (!side?.attack) return null

  const dx = aimX - fromX
  const dy = aimY - fromY
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (side.attackDownRight && side.attackDownLeft && side.attackDown) {
    if (dy > 0 && absDy > absDx * 0.25) {
      if (absDx < absDy * 0.5) {
        return { clip: side.attackDown, flipX: false }
      }
      if (dx >= 0) {
        return { clip: side.attackDownRight, flipX: false }
      }
      return { clip: side.attackDownLeft, flipX: false }
    }
    return { clip: side.attack, flipX: dx < 0 }
  }

  if (side.attackUp && side.attackDown && absDy > absDx) {
    if (dy < 0) {
      return { clip: side.attackUp, flipX: false }
    }
    return { clip: side.attackDown, flipX: false }
  }

  return { clip: side.attack, flipX: dx < 0 }
}

export function resolveAttackAnimKey(
  cardId: string,
  owner: Owner,
  fromX: number,
  fromY: number,
  aimX: number,
  aimY: number,
): { key: string; flipX: boolean } {
  const resolved = resolveAttackClip(cardId, owner, fromX, fromY, aimX, aimY)
  if (!resolved) {
    return { key: clipAnimKey(cardId, owner, 'attack'), flipX: false }
  }

  const { clip, flipX } = resolved
  const side = getSideAssets(cardId, owner)!
  if (clip === side.attackUp) {
    return { key: clipAnimKey(cardId, owner, 'attack', 'up'), flipX }
  }
  if (clip === side.attackDown) {
    return { key: clipAnimKey(cardId, owner, 'attack', 'down'), flipX }
  }
  if (clip === side.attackDownRight) {
    return { key: clipAnimKey(cardId, owner, 'attack', 'down_right'), flipX }
  }
  if (clip === side.attackDownLeft) {
    return { key: clipAnimKey(cardId, owner, 'attack', 'down_left'), flipX }
  }
  return { key: clipAnimKey(cardId, owner, 'attack'), flipX }
}

export function isAnimatedCard(cardId: string): boolean {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  return bundle?.animated !== false
}

export function idleSheetKey(cardId: string, owner: Owner): string {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  if (!bundle) return owner === Owner.PLAYER ? 'placeholder_player' : 'placeholder_bot'
  const side = owner === Owner.PLAYER ? bundle.player : bundle.bot
  return side.idle.sheet.key
}

/** Card-hand portrait definition — throws if the card has no dedicated avatar. */
export function getCardAvatarDef(cardId: string): ImageDef {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  if (!bundle) throw new Error(`Unknown card id: ${cardId}`)
  if (!bundle.avatar) {
    throw new Error(
      `Card "${cardId}" has no card-hand avatar. Ask which portrait to use — do not use a placeholder or unit spritesheet.`,
    )
  }
  return bundle.avatar
}

/** Static card-hand portrait texture key — never falls back to idle sheets or placeholders. */
export function cardAvatarKey(cardId: string): string {
  return getCardAvatarDef(cardId).key
}

export function getCardAvatars(): ImageDef[] {
  const seen = new Set<string>()
  const avatars: ImageDef[] = []
  for (const bundle of CARD_ASSET_BUNDLES) {
    if (bundle.avatar && !seen.has(bundle.avatar.key)) {
      seen.add(bundle.avatar.key)
      avatars.push(bundle.avatar)
    }
  }
  return avatars
}

export function getCardAvatarBackdrops(): ImageDef[] {
  const seen = new Set<string>()
  const backdrops: ImageDef[] = []
  for (const bundle of CARD_ASSET_BUNDLES) {
    if (bundle.avatarBackdrop && !seen.has(bundle.avatarBackdrop.key)) {
      seen.add(bundle.avatarBackdrop.key)
      backdrops.push(bundle.avatarBackdrop)
    }
  }
  return backdrops
}

/** Optional card-hand frame behind raw portraits (e.g. bomb sprite). */
export function getCardAvatarBackdrop(cardId: string): ImageDef | null {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  return bundle?.avatarBackdrop ?? null
}

export function getCardAvatarHandScale(cardId: string): number {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  return bundle?.avatarHandScale ?? 1
}

export function getCardAvatarCropRatio(cardId: string): number {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  return bundle?.avatarCropRatio ?? AVATAR_CROP_RATIO_DEFAULT
}

export function getCardAvatarFocusY(cardId: string): number {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  return bundle?.avatarFocusY ?? 0.5
}

export function getCardAvatarBuildingFit(cardId: string): boolean {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  return bundle?.avatarBuildingFit === true
}

/** Composite card hand — layered sprites from unit editor vs static avatar PNG. */
export function getUseEditorCompositeAvatar(cardId: string): boolean {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  return bundle?.useEditorCompositeAvatar === true
}

export function getCardAvatarSwarmSource(cardId: string): string | null {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  return bundle?.avatarSwarmSourceCardId ?? null
}

export function getUniqueSheets(): SheetDef[] {
  const seen = new Set<string>()
  const sheets: SheetDef[] = []
  for (const bundle of CARD_ASSET_BUNDLES) {
    for (const sideAssets of [bundle.player, bundle.bot]) {
      const clips = [
        sideAssets.idle,
        sideAssets.run,
        sideAssets.attack,
        sideAssets.attackUp,
        sideAssets.attackDown,
      ]
      for (const clip of clips) {
        if (!clip || seen.has(clip.sheet.key)) continue
        seen.add(clip.sheet.key)
        sheets.push(clip.sheet)
      }
    }
  }
  for (const sheet of getGarrisonExtraSheets()) {
    if (seen.has(sheet.key)) continue
    seen.add(sheet.key)
    sheets.push(sheet)
  }
  return sheets
}

const GARRISON_CANNON_PATH = 'assets/Enemy Pack/Enemies/Pirate Fish/Cannon'
const GARRISON_CANNON_FRAME = 128

/** King-tower attack projectile — static 128×128 ball from the garrison cannon folder. */
export const GARRISON_CANNON_BALL = {
  key: 'garrison_cannon_ball',
  path: `${GARRISON_CANNON_PATH}/Cannon_Ball.png`,
} as const satisfies ImageDef

/** King-tower garrison cannon — directional 128×128 sheets. */
export const GARRISON_CANNON_SHEETS = {
  right: {
    key: 'garrison_cannon_right',
    path: `${GARRISON_CANNON_PATH}/Cannon_Right.png`,
    frameWidth: GARRISON_CANNON_FRAME,
    frameHeight: GARRISON_CANNON_FRAME,
  },
  up: {
    key: 'garrison_cannon_up',
    path: `${GARRISON_CANNON_PATH}/Cannon_Up.png`,
    frameWidth: GARRISON_CANNON_FRAME,
    frameHeight: GARRISON_CANNON_FRAME,
  },
  down: {
    key: 'garrison_cannon_down',
    path: `${GARRISON_CANNON_PATH}/Cannon_Down.png`,
    frameWidth: GARRISON_CANNON_FRAME,
    frameHeight: GARRISON_CANNON_FRAME,
  },
  upRight: {
    key: 'garrison_cannon_up_right',
    path: `${GARRISON_CANNON_PATH}/Cannon_UpRight.png`,
    frameWidth: GARRISON_CANNON_FRAME,
    frameHeight: GARRISON_CANNON_FRAME,
  },
  downRight: {
    key: 'garrison_cannon_down_right',
    path: `${GARRISON_CANNON_PATH}/Cannon_DownRight.png`,
    frameWidth: GARRISON_CANNON_FRAME,
    frameHeight: GARRISON_CANNON_FRAME,
  },
} as const satisfies Record<string, SheetDef>

export function getGarrisonExtraSheets(): SheetDef[] {
  return Object.values(GARRISON_CANNON_SHEETS)
}

/** Default facing for the king-tower cannon while idle. */
export function garrisonCannonIdleKey(owner: Owner): string {
  return owner === Owner.PLAYER
    ? GARRISON_CANNON_SHEETS.up.key
    : GARRISON_CANNON_SHEETS.down.key
}

/** Aim the garrison cannon at a target — mirrors archer diagonal clip picking. */
export function resolveGarrisonCannonKey(
  fromX: number,
  fromY: number,
  aimX: number,
  aimY: number,
): { key: string; flipX: boolean } {
  const dx = aimX - fromX
  const dy = aimY - fromY
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (dy < 0 && absDy > absDx * 0.25) {
    if (absDx < absDy * 0.5) {
      return { key: GARRISON_CANNON_SHEETS.up.key, flipX: false }
    }
    return { key: GARRISON_CANNON_SHEETS.upRight.key, flipX: dx < 0 }
  }
  if (dy > 0 && absDy > absDx * 0.25) {
    if (absDx < absDy * 0.5) {
      return { key: GARRISON_CANNON_SHEETS.down.key, flipX: false }
    }
    return { key: GARRISON_CANNON_SHEETS.downRight.key, flipX: dx < 0 }
  }
  return { key: GARRISON_CANNON_SHEETS.right.key, flipX: dx < 0 }
}

export function getSideAssets(cardId: string, owner: Owner): SideAssets | null {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  if (!bundle) return null
  return owner === Owner.PLAYER ? bundle.player : bundle.bot
}

/** Wall-clock duration of a clip at its native frame rate. */
export function getClipDurationMs(cardId: string, owner: Owner, anim: AnimClip): number {
  const side = getSideAssets(cardId, owner)
  if (!side) return 0
  const clip = side[anim]
  const frameCount = clip.end - clip.start + 1
  return (frameCount / clip.frameRate) * 1000
}

/** Mid-stride frame from the run sheet — frozen pose during opening dash leaps. */
export function getRunLeapPose(cardId: string, owner: Owner): { sheetKey: string; frame: number } | null {
  const side = getSideAssets(cardId, owner)
  if (!side?.run) return null
  const clip = side.run
  const frameCount = clip.end - clip.start + 1
  const frame = clip.start + Math.floor(frameCount / 2)
  return { sheetKey: clip.sheet.key, frame }
}

/** Ms from attack anim start → damage tick (native frame rate, not stretched). */
export function getAttackWindupMs(cardId: string, owner: Owner): number {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  const side = getSideAssets(cardId, owner)
  if (!bundle || !side || bundle.animated === false) return 0

  const clip = side.attack
  const hitFrame = bundle.attackHitFrame ?? clip.end
  const framesBeforeHit = Math.max(0, hitFrame - clip.start)
  if (framesBeforeHit === 0) return 0
  return (framesBeforeHit / clip.frameRate) * 1000
}
