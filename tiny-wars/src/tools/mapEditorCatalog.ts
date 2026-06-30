import { CardType } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import {
  CARD_ASSET_BUNDLES,
  FRAME_H,
  FRAME_W,
  PIRATE_TOWER_GROUND,
} from '@data/AssetManifest'
import { MAP_HEIGHT_MULTIPLIER } from '@data/GameConstants'
import { COMPOSITE_LAYER_OFFSETS } from '@data/CompositeLayerOffsets'
import {
  COMPOSITE_AVATAR_FRAME_POS_DEFAULTS,
  COMPOSITE_AVATAR_LAYOUT_DEFAULTS,
  COMPOSITE_AVATAR_SLOT_SCALE,
} from '@data/CompositeAvatarLayout'
import { BOMB_TOWER_CREW_CARD_ID, BOMB_TOWER_DECK_Y_FRAC } from '@rendering/towerGarrison'
import {
  MAP_EDITOR_CATALOG_ORDER,
  MAP_EDITOR_DISPLAY_NAME_OVERRIDES,
  MAP_EDITOR_TOWER_ENTRIES,
  MAP_EDITOR_TOWER_PATHS,
  MAP_EDITOR_UNIT_OVERRIDES,
} from './mapEditorOverrides'

export interface MapEditorUnitEntry {
  id: string
  name: string
  attackRange: number
  fw: number
  fh: number
  path?: string
  pathRef?: string
  contentFill: number
  isTower?: boolean
  isKing?: boolean
  isBuilding?: boolean
  tintBotSide?: boolean
  spriteOriginY?: number
  footprintWidthRatio?: number
  footprintHeightRatio?: number
  hbarOffsetY?: number
  slotOffsetX?: number
  slotOffsetY?: number
}

export interface MapEditorGeneratedConstants {
  towerEditorPaths: typeof MAP_EDITOR_TOWER_PATHS
  pirateTowerGround: string
  bombTowerBomberPaths: { player: string; cpu: string }
  bombTowerDeckYFrac: number
  mapHeightMultiplierBuilding: number
  compositeLayerOffsets: typeof COMPOSITE_LAYER_OFFSETS
  compositeAvatarLayoutDefaults: typeof COMPOSITE_AVATAR_LAYOUT_DEFAULTS
  compositeAvatarSlotScale: typeof COMPOSITE_AVATAR_SLOT_SCALE
  compositeAvatarFramePosDefaults: typeof COMPOSITE_AVATAR_FRAME_POS_DEFAULTS
}

const SPELL_CARD_IDS = new Set(['arrows', 'tnt', 'goblin_barrel'])
const COMPOSITE_EDITOR_UNIT_IDS = ['wood_tower', 'air_boat'] as const

export interface CompositeStaticAvatarMeta {
  frameW?: number
  frameH?: number
  buildingFit: boolean
  cropRatio: number
  focusY: number
  handScale: number
  hasBackdrop: boolean
}

export function buildCompositeAvatarEditorConstants(): {
  useEditorCompositeAvatar: Record<string, boolean>
  staticAvatarPaths: Record<string, string>
  staticAvatarMeta: Record<string, CompositeStaticAvatarMeta>
} {
  const useEditorCompositeAvatar: Record<string, boolean> = {}
  const staticAvatarPaths: Record<string, string> = {}
  const staticAvatarMeta: Record<string, CompositeStaticAvatarMeta> = {}

  for (const id of COMPOSITE_EDITOR_UNIT_IDS) {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === id)
    if (!bundle) continue
    useEditorCompositeAvatar[id] = bundle.useEditorCompositeAvatar === true
    staticAvatarPaths[id] = bundle.avatar.path
    staticAvatarMeta[id] = {
      frameW: bundle.avatar.frameWidth,
      frameH: bundle.avatar.frameHeight,
      buildingFit: bundle.avatarBuildingFit === true,
      cropRatio: bundle.avatarCropRatio ?? 0.62,
      focusY: bundle.avatarFocusY ?? 0.5,
      handScale: bundle.avatarHandScale ?? 1,
      hasBackdrop: bundle.avatarBackdrop != null,
    }
  }

  return { useEditorCompositeAvatar, staticAvatarPaths, staticAvatarMeta }
}

export function buildMapEditorConstants(): MapEditorGeneratedConstants {
  const crewBundle = CARD_ASSET_BUNDLES.find(b => b.cardId === BOMB_TOWER_CREW_CARD_ID)
  const playerIdle = crewBundle?.player.idle.sheet.path ?? ''
  const botIdle = crewBundle?.bot.idle.sheet.path ?? playerIdle

  return {
    towerEditorPaths: MAP_EDITOR_TOWER_PATHS,
    pirateTowerGround: PIRATE_TOWER_GROUND,
    bombTowerBomberPaths: {
      player: playerIdle,
      cpu: botIdle,
    },
    bombTowerDeckYFrac: BOMB_TOWER_DECK_Y_FRAC,
    mapHeightMultiplierBuilding: MAP_HEIGHT_MULTIPLIER.building,
    compositeLayerOffsets: COMPOSITE_LAYER_OFFSETS,
    compositeAvatarLayoutDefaults: COMPOSITE_AVATAR_LAYOUT_DEFAULTS,
    compositeAvatarSlotScale: COMPOSITE_AVATAR_SLOT_SCALE,
    compositeAvatarFramePosDefaults: COMPOSITE_AVATAR_FRAME_POS_DEFAULTS,
  }
}

function buildCardEntry(cardId: string): MapEditorUnitEntry | null {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  const card = CARD_DEFINITIONS[cardId]
  if (!bundle || !card?.stats) return null
  if (card.cardType === CardType.SPELL || SPELL_CARD_IDS.has(cardId)) return null

  const sheet = bundle.player.idle.sheet
  const entry: MapEditorUnitEntry = {
    id: cardId,
    name: MAP_EDITOR_DISPLAY_NAME_OVERRIDES[cardId] ?? card.displayName,
    attackRange: card.stats.attackRange,
    fw: sheet.frameWidth ?? FRAME_W,
    fh: sheet.frameHeight ?? FRAME_H,
    path: sheet.path,
    contentFill: bundle.contentFill ?? 0.55,
  }

  if (card.cardType === CardType.BUILDING) entry.isBuilding = true
  if (bundle.tintBotSide) entry.tintBotSide = true
  if (bundle.footprintWidthRatio !== undefined) entry.footprintWidthRatio = bundle.footprintWidthRatio
  if (bundle.footprintHeightRatio !== undefined) entry.footprintHeightRatio = bundle.footprintHeightRatio

  const extra = MAP_EDITOR_UNIT_OVERRIDES[cardId]
  if (extra) Object.assign(entry, extra)

  return entry
}

export function buildMapEditorCatalog(): MapEditorUnitEntry[] {
  const byId = new Map<string, MapEditorUnitEntry>()

  for (const bundle of CARD_ASSET_BUNDLES) {
    const entry = buildCardEntry(bundle.cardId)
    if (entry) byId.set(entry.id, entry)
  }

  for (const tower of MAP_EDITOR_TOWER_ENTRIES) {
    byId.set(tower.id, { ...tower })
  }

  const ordered: MapEditorUnitEntry[] = []
  const seen = new Set<string>()

  for (const id of MAP_EDITOR_CATALOG_ORDER) {
    const entry = byId.get(id)
    if (!entry) continue
    ordered.push(entry)
    seen.add(id)
  }

  for (const [id, entry] of byId) {
    if (!seen.has(id)) ordered.push(entry)
  }

  return ordered
}

function jsString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function formatEntry(entry: MapEditorUnitEntry): string {
  const parts = [
    `id:${jsString(entry.id)}`,
    `name:${jsString(entry.name)}`,
    `attackRange:${entry.attackRange}`,
    `fw:${entry.fw}`,
    `fh:${entry.fh}`,
  ]

  if (entry.pathRef) parts.push(`path:${entry.pathRef}`)
  else if (entry.path) parts.push(`path:${jsString(entry.path)}`)

  parts.push(`contentFill:${entry.contentFill}`)

  if (entry.isBuilding) parts.push('isBuilding:true')
  if (entry.isTower) parts.push('isTower:true')
  if (entry.isKing) parts.push('isKing:true')
  if (entry.tintBotSide) parts.push('tintBotSide:true')
  if (entry.spriteOriginY !== undefined) parts.push(`spriteOriginY:${entry.spriteOriginY}`)
  if (entry.footprintWidthRatio !== undefined) parts.push(`footprintWidthRatio:${entry.footprintWidthRatio}`)
  if (entry.footprintHeightRatio !== undefined) parts.push(`footprintHeightRatio:${entry.footprintHeightRatio}`)
  if (entry.hbarOffsetY !== undefined) parts.push(`hbarOffsetY:${entry.hbarOffsetY}`)
  if (entry.slotOffsetX !== undefined) parts.push(`slotOffsetX:${entry.slotOffsetX}`)
  if (entry.slotOffsetY !== undefined) parts.push(`slotOffsetY:${entry.slotOffsetY}`)

  return `  { ${parts.join(', ')} }`
}

export function formatMapEditorGeneratedBlock(): string {
  const constants = buildMapEditorConstants()
  const compositeAvatar = buildCompositeAvatarEditorConstants()
  const catalog = buildMapEditorCatalog()

  const lines = [
    '// @generated map-editor-sync-start — do not edit; run: npm run sync:map-editor',
    '// Mirrors CardData.ts + AssetManifest.ts + towerGarrison.ts (see src/tools/mapEditorCatalog.ts).',
    'const TOWER_EDITOR_PATHS = {',
    '  player: {',
    `    princess: ${jsString(constants.towerEditorPaths.player.princess)},`,
    `    king:     ${jsString(constants.towerEditorPaths.player.king)},`,
    '  },',
    '  bot: {',
    `    princess: ${jsString(constants.towerEditorPaths.bot.princess)},`,
    `    king:     ${jsString(constants.towerEditorPaths.bot.king)},`,
    '  },',
    '}',
    `const PIRATE_TOWER_GROUND = ${jsString(constants.pirateTowerGround)}`,
    '/** Bomb tower deck bomber — mirrors BombTowerCrew.ts (bomb_fish idle sheets). */',
    'const BOMB_TOWER_BOMBER_PATHS = {',
    `  player: ${jsString(constants.bombTowerBomberPaths.player)},`,
    `  cpu:    ${jsString(constants.bombTowerBomberPaths.cpu)},`,
    '}',
    `const BOMB_TOWER_DECK_Y_FRAC = ${constants.bombTowerDeckYFrac}`,
    `const MAP_HEIGHT_MULTIPLIER_BUILDING = ${constants.mapHeightMultiplierBuilding}`,
    `const COMPOSITE_LAYER_OFFSETS_DEFAULTS = ${JSON.stringify(constants.compositeLayerOffsets, null, 2)}`,
    `const COMPOSITE_AVATAR_LAYOUT_DEFAULTS = ${JSON.stringify(constants.compositeAvatarLayoutDefaults, null, 2)}`,
    `const COMPOSITE_AVATAR_SLOT_SCALE = ${JSON.stringify(constants.compositeAvatarSlotScale, null, 2)}`,
    `const COMPOSITE_AVATAR_FRAME_POS_DEFAULTS = ${JSON.stringify(constants.compositeAvatarFramePosDefaults, null, 2)}`,
    `const USE_EDITOR_COMPOSITE_AVATAR_DEFAULTS = ${JSON.stringify(compositeAvatar.useEditorCompositeAvatar, null, 2)}`,
    `const COMPOSITE_STATIC_AVATAR_PATHS = ${JSON.stringify(compositeAvatar.staticAvatarPaths, null, 2)}`,
    `const COMPOSITE_STATIC_AVATAR_META = ${JSON.stringify(compositeAvatar.staticAvatarMeta, null, 2)}`,
    'const UNIT_CATALOG = [',
  ]

  let lastGroup: 'troop' | 'building' | 'tower' | null = null
  for (const entry of catalog) {
    const group = entry.isTower ? 'tower' : entry.isBuilding ? 'building' : 'troop'
    if (group !== lastGroup) {
      if (group === 'building') lines.push('  // Buildings — deployable structures (CardData building cards)')
      else if (group === 'tower') lines.push('  // Towers — sprite follows Player ↓ / CPU ↑ approach side')
      else if (lastGroup === null) lines.push('  // Troops')
      lastGroup = group
    }
    lines.push(`${formatEntry(entry)},`)
  }

  lines.push(']', '// @generated map-editor-sync-end')
  return lines.join('\n')
}

export const MAP_EDITOR_SYNC_START = '// @generated map-editor-sync-start'
export const MAP_EDITOR_SYNC_END = '// @generated map-editor-sync-end'

export function extractMapEditorGeneratedBlock(html: string): string | null {
  const start = html.indexOf(MAP_EDITOR_SYNC_START)
  const end = html.indexOf(MAP_EDITOR_SYNC_END)
  if (start < 0 || end < 0 || end <= start) return null
  return html.slice(start, end + MAP_EDITOR_SYNC_END.length).trimEnd()
}
