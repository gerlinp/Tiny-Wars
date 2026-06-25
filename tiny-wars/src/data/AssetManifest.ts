import { Owner } from '@core/types'

export const FRAME_W = 192
export const FRAME_H = 192

export interface SheetDef {
  key: string
  path: string
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
}

export interface CardAssetBundle {
  cardId: string
  /** When false, render first frame only — no sprite animation */
  animated?: boolean
  /** Fraction of frame height occupied by visible art (sprite-sheet padding compensation) */
  contentFill?: number
  /** Fine-tune height within tier (1 = default) */
  mapHeightScale?: number
  /** Sheet frame index where the strike/release lands (defaults to last attack frame) */
  attackHitFrame?: number
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

function clip(sheet: SheetDef, start: number, end: number, frameRate = 8, repeat = -1): ClipDef {
  return { sheet, start, end, frameRate, repeat }
}

function goblinSheet(cardId: string, side: 'Blue' | 'Red', folder: string, file: string): SheetDef {
  const prefix = side === 'Blue' ? 'blue' : 'red'
  return {
    key: `${cardId}_${prefix}_sheet`,
    path: `assets/Factions/Goblins/${folder}/${side}/${file}`,
  }
}

/** Goblin buildings store both color variants in the same folder (no Blue/Red subdirs). */
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
): SideAssets {
  const sheet = goblinBuildingSheet(cardId, side, folder, file)
  return {
    idle:   clip(sheet, rows.idle[0],   rows.idle[1],   10, -1),
    run:    clip(sheet, rows.run[0],    rows.run[1],    14, -1),
    attack: clip(sheet, rows.attack[0], rows.attack[1], 14, -1),
  }
}

function goblinSide(
  cardId: string,
  side: 'Blue' | 'Red',
  folder: string,
  file: string,
  rows: { idle: [number, number]; run: [number, number]; attack: [number, number] },
): SideAssets {
  const sheet = goblinSheet(cardId, side, folder, file)
  return {
    idle:   clip(sheet, rows.idle[0],   rows.idle[1],   10, -1),
    run:    clip(sheet, rows.run[0],    rows.run[1],    14, -1),
    attack: clip(sheet, rows.attack[0], rows.attack[1], 14, -1),
  }
}

export const CARD_ASSET_BUNDLES: CardAssetBundle[] = [
  {
    cardId: 'warrior',
    contentFill: 0.52,
    attackHitFrame: 2,
    player: knightSide('Warrior', 'Blue'),
    bot:    knightSide('Warrior', 'Red'),
  },
  {
    cardId: 'archer',
    contentFill: 0.50,
    attackHitFrame: 5,
    player: knightSide('Archer', 'Blue'),
    bot:    knightSide('Archer', 'Red'),
  },
  {
    cardId: 'pawn',
    contentFill: 0.52,
    attackHitFrame: 2,
    player: knightSide('Pawn', 'Blue'),
    bot:    knightSide('Pawn', 'Red'),
  },
  {
    cardId: 'torch_goblin',
    contentFill: 0.55,
    attackHitFrame: 18,
    player: goblinSide('torch_goblin', 'Blue', 'Troops/Torch', 'Torch_Blue.png',  { idle: [0, 6],  run: [7, 13],  attack: [14, 20] }),
    bot:    goblinSide('torch_goblin', 'Red',  'Troops/Torch', 'Torch_Red.png',   { idle: [0, 6],  run: [7, 13],  attack: [14, 20] }),
  },
  {
    cardId: 'tnt',
    animated: false,
    contentFill: 0.55,
    player: goblinSide('tnt', 'Blue', 'Troops/TNT', 'TNT_Blue.png', { idle: [0, 6], run: [0, 6], attack: [7, 13] }),
    bot:    goblinSide('tnt', 'Red',  'Troops/TNT', 'TNT_Red.png',  { idle: [0, 6], run: [0, 6], attack: [7, 13] }),
  },
  {
    cardId: 'barrel',
    animated: false,
    contentFill: 0.48,
    player: goblinSide('barrel', 'Blue', 'Troops/Barrel', 'Barrel_Blue.png', { idle: [0, 3], run: [4, 7], attack: [8, 11] }),
    bot:    goblinSide('barrel', 'Red',  'Troops/Barrel', 'Barrel_Red.png',  { idle: [0, 3], run: [4, 7], attack: [8, 11] }),
  },
  {
    cardId: 'wood_tower',
    animated: false,
    contentFill: 0.72,
    player: goblinBuildingSide('wood_tower', 'Blue', 'Buildings/Wood_Tower', 'Wood_Tower_Blue.png', { idle: [0, 4], run: [0, 4], attack: [0, 4] }),
    bot:    goblinBuildingSide('wood_tower', 'Red',  'Buildings/Wood_Tower', 'Wood_Tower_Red.png',  { idle: [0, 4], run: [0, 4], attack: [0, 4] }),
  },
]

export type AnimClip = 'idle' | 'run' | 'attack'

export function clipAnimKey(cardId: string, owner: Owner, anim: AnimClip): string {
  const side = owner === Owner.PLAYER ? 'blue' : 'red'
  return `${cardId}_${side}_${anim}`
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

export function getUniqueSheets(): SheetDef[] {
  const seen = new Set<string>()
  const sheets: SheetDef[] = []
  for (const bundle of CARD_ASSET_BUNDLES) {
    for (const sideAssets of [bundle.player, bundle.bot]) {
      for (const clip of [sideAssets.idle, sideAssets.run, sideAssets.attack]) {
        if (!seen.has(clip.sheet.key)) {
          seen.add(clip.sheet.key)
          sheets.push(clip.sheet)
        }
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
