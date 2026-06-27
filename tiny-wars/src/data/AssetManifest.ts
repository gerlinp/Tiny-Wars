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
    displayHeight: 12,
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
    displayHeight: 20,
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
    keys.push(variant.base, variant.fill)
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
  /** Tall building sprites — fit full frame in the slot instead of portrait crop. */
  avatarBuildingFit?: boolean
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

function goblinBuildingSheet(cardId: string, side: 'Blue' | 'Red', folder: string, file: string): SheetDef {
  const prefix = side === 'Blue' ? 'blue' : 'red'
  return {
    key: `${cardId}_${prefix}_sheet`,
    path: `assets/Factions/Goblins/${folder}/${file}`,
  }
}

function goblinBuildingSide(
  cardId: string,
  side: 'Blue' | 'Red',
  folder: string,
  file: string,
  rows: { idle: [number, number]; run: [number, number]; attack: [number, number] },
  frameWidth = FRAME_W,
  frameHeight = FRAME_H,
): SideAssets {
  const sheet: SheetDef = { ...goblinBuildingSheet(cardId, side, folder, file), frameWidth, frameHeight }
  return {
    idle:   clip(sheet, rows.idle[0],   rows.idle[1],   10, -1),
    run:    clip(sheet, rows.run[0],    rows.run[1],    14, -1),
    attack: clip(sheet, rows.attack[0], rows.attack[1], 14, -1),
  }
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

const ICON_FRAME = 64

function iconOnlySide(key: string, path: string): SideAssets {
  const sheet: SheetDef = { key, path, frameWidth: ICON_FRAME, frameHeight: ICON_FRAME }
  const frame = clip(sheet, 0, 0, 1, -1)
  return { idle: frame, run: frame, attack: frame }
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

/** Enemy Pack Spear Goblin — 256×256 frames; Attack Strong sheet unused. */
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
    path: `${SPEAR_GOBLIN_PATH}/Spear Goblin_Attack Fast.png`,
    frameWidth: SPEAR_GOBLIN_FRAME,
    frameHeight: SPEAR_GOBLIN_FRAME,
  }
  return {
    idle:   clip(idle,   0, 7, 10, -1),
    run:    clip(run,    0, 5, 14, -1),
    attack: clip(attack, 0, 6, 14,  0),
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
    cardId: 'pawn',
    avatar: humanAvatar('Avatars_05.png'),
    contentFill: 0.52,
    attackHitFrame: 2,
    player: knightSide('Pawn', 'Blue'),
    bot:    knightSide('Pawn', 'Red'),
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
    avatar: enemyAvatar('Spear Goblin.png'),
    avatarCropRatio: 0.55,
    contentFill: 0.55,
    attackHitFrame: 4,
    tintBotSide: true,
    player: spearGoblinSide('blue'),
    bot:    spearGoblinSide('red'),
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
      path: 'assets/Factions/Goblins/Buildings/Wood_Tower/Wood_Tower_Blue.png',
      frameWidth: 205,
      frameHeight: 192,
      frame: 0,
    },
    avatarBuildingFit: true,
    avatarHandScale: 0.92,
    animated: false,
    contentFill: 0.72,
    footprintWidthRatio: 0.42,
    footprintHeightRatio: 0.36,
    player: goblinBuildingSide('wood_tower', 'Blue', 'Buildings/Wood_Tower', 'Wood_Tower_Blue.png', { idle: [0, 4], run: [0, 4], attack: [0, 4] }, 205, 192),
    bot:    goblinBuildingSide('wood_tower', 'Red',  'Buildings/Wood_Tower', 'Wood_Tower_Red.png',  { idle: [0, 4], run: [0, 4], attack: [0, 4] }, 205, 192),
  },
  {
    cardId: 'tnt',
    avatar: { key: 'avatar_bomb_idle', path: `${BOMB_PATH}/Bomb_Idle.png` },
    avatarBackdrop: AVATAR_BACKDROP_BANNER,
    contentFill: 0.82,
    player: bombSide(),
    bot:    bombSide(),
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
export function resolveAttackAnimKey(
  cardId: string,
  owner: Owner,
  fromX: number,
  fromY: number,
  aimX: number,
  aimY: number,
): { key: string; flipX: boolean } {
  const side = getSideAssets(cardId, owner)
  const dx = aimX - fromX
  const dy = aimY - fromY
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (side?.attackDownRight && side?.attackDownLeft && side?.attackDown) {
    if (dy > 0 && absDy > absDx * 0.25) {
      if (absDx < absDy * 0.5) {
        return { key: clipAnimKey(cardId, owner, 'attack', 'down'), flipX: false }
      }
      if (dx >= 0) {
        return { key: clipAnimKey(cardId, owner, 'attack', 'down_right'), flipX: false }
      }
      return { key: clipAnimKey(cardId, owner, 'attack', 'down_left'), flipX: false }
    }
    return { key: clipAnimKey(cardId, owner, 'attack'), flipX: dx < 0 }
  }

  if (side?.attackUp && side?.attackDown && absDy > absDx) {
    if (dy < 0) {
      return { key: clipAnimKey(cardId, owner, 'attack', 'up'), flipX: false }
    }
    return { key: clipAnimKey(cardId, owner, 'attack', 'down'), flipX: false }
  }

  return {
    key: clipAnimKey(cardId, owner, 'attack'),
    flipX: dx < 0,
  }
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

export function getCardAvatarBuildingFit(cardId: string): boolean {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  return bundle?.avatarBuildingFit === true
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
  return sheets
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
