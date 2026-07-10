import { CardType } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import {
  CARD_ASSET_BUNDLES,
  FRAME_H,
  FRAME_W,
  PIRATE_TOWER_GROUND,
} from '@data/AssetManifest'
import {
  ARENA_FENCE_COLS,
  ARENA_FENCE_ROWS,
  BOT_KING_COL,
  BOT_KING_ROW,
  BOT_KING_VISUAL_ROW,
  BOT_TOWER_ROW,
  BRIDGE_CENTER_COL,
  BRIDGE_SPAN,
  CELL_SIZE,
  DEPLOY_LANE_SPLIT_COL,
  GRID_COLS,
  GRID_ROWS,
  KING_SPRITE_CENTER_OFFSET_X,
  LEFT_BRIDGE_COLS,
  MAP_HEIGHT_MULTIPLIER,
  MAP_UNIT_TARGET_HEIGHT,
  PLAYER_KING_COL,
  PLAYER_KING_ROW,
  PLAYER_KING_VISUAL_ROW,
  PLAYER_TOWER_COLS,
  PLAYER_TOWER_ROW,
  RIGHT_BRIDGE_COLS,
  SPRITE_VISUAL_SCALE,
} from '@data/GameConstants'
import {
  BOT_KING_TOWER_MELEE,
  PLAYER_KING_TOWER_MELEE,
} from '@data/KingTowerMeleeLayout'
import {
  BOMB_TOWER_CREW_CARD_ID,
  BOMB_TOWER_DECK_Y_FRAC,
  KING_GARRISON_EDITOR_DEFAULTS,
  KING_TOWER_VISUAL_OFFSET_DEFAULTS,
} from '@rendering/towerGarrison'
import { COMPOSITE_LAYER_OFFSETS } from '@data/CompositeLayerOffsets'
import {
  COMPOSITE_AVATAR_FRAME_POS_DEFAULTS,
  COMPOSITE_AVATAR_LAYOUT_DEFAULTS,
  COMPOSITE_AVATAR_SLOT_SCALE,
} from '@data/CompositeAvatarLayout'
import { CARD_DISPLAY_VISUAL_SCALE } from '@rendering/assetDisplaySize'
import { buildClashStyleSpawnZones } from '@data/SpawnZones'
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
  elixirCost?: number
  balance?: MapEditorBalanceEntry
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

export interface MapEditorBalanceEntry {
  sourceFile: 'tiny-wars/src/data/CardData.ts'
  sourceObject: string
  cardType: string
  elixirCost: number
  deployCount?: number
  stats: Record<string, unknown>
  notes?: Record<string, string>
}

export interface MapEditorLayoutConstants {
  gridCols: number
  gridRows: number
  gameCellSize: number
  arenaFenceRows: number
  arenaFenceCols: number
  unitHeightCells: number
  spriteVisualScale: number
  deployLaneSplitCol: number
  kingLogicCol: number
  kingSpriteCenterOffsetX: number
  playerKingRow: number
  botKingRow: number
  playerTowerRow: number
  botTowerRow: number
  playerTowerColLeft: number
  playerTowerColRight: number
  playerKingVisualRow: number
  botKingVisualRow: number
  bridgeCenterCol: number
  bridgeSpan: number
  leftBridgeStart: number
  rightBridgeStart: number
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
  cardDisplayVisualScale: typeof CARD_DISPLAY_VISUAL_SCALE
}

const SPELL_CARD_IDS = new Set(['arrows', 'big_bomb', 'goblin_barrel'])
const COMPOSITE_EDITOR_UNIT_IDS = ['wood_tower', 'air_boat'] as const

function buildBalanceEntry(cardId: string): MapEditorBalanceEntry | undefined {
  const card = CARD_DEFINITIONS[cardId]
  if (!card?.stats) return undefined
  return {
    sourceFile: 'tiny-wars/src/data/CardData.ts',
    sourceObject: `CARD_DEFINITIONS_BASE.${cardId}`,
    cardType: card.cardType,
    elixirCost: card.elixirCost,
    deployCount: card.deployCount,
    stats: { ...card.stats },
    notes: {
      vision: 'No per-card vision stat exists yet; targeting acquisition currently uses shared combat constants.',
      attackRate: 'Attacks per second; CardData often stores this as 1 / hitSpeedSeconds.',
      speed: 'Grid cells per second; CardData may derive this from CR_SPEED via crSpeedToCellsPerSec().',
    },
  }
}

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

export function buildMapEditorLayoutConstants(): MapEditorLayoutConstants {
  if (PLAYER_KING_COL !== BOT_KING_COL) {
    throw new Error(`map editor expects symmetric king cols; got player=${PLAYER_KING_COL} bot=${BOT_KING_COL}`)
  }
  return {
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    gameCellSize: CELL_SIZE,
    arenaFenceRows: ARENA_FENCE_ROWS,
    arenaFenceCols: ARENA_FENCE_COLS,
    unitHeightCells: MAP_UNIT_TARGET_HEIGHT / CELL_SIZE,
    spriteVisualScale: SPRITE_VISUAL_SCALE,
    deployLaneSplitCol: DEPLOY_LANE_SPLIT_COL,
    kingLogicCol: PLAYER_KING_COL,
    kingSpriteCenterOffsetX: KING_SPRITE_CENTER_OFFSET_X,
    playerKingRow: PLAYER_KING_ROW,
    botKingRow: BOT_KING_ROW,
    playerTowerRow: PLAYER_TOWER_ROW,
    botTowerRow: BOT_TOWER_ROW,
    playerTowerColLeft: PLAYER_TOWER_COLS[0]!,
    playerTowerColRight: PLAYER_TOWER_COLS[1]!,
    playerKingVisualRow: PLAYER_KING_VISUAL_ROW,
    botKingVisualRow: BOT_KING_VISUAL_ROW,
    bridgeCenterCol: BRIDGE_CENTER_COL,
    bridgeSpan: BRIDGE_SPAN,
    leftBridgeStart: LEFT_BRIDGE_COLS[0]!,
    rightBridgeStart: RIGHT_BRIDGE_COLS[0]!,
  }
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
    cardDisplayVisualScale: CARD_DISPLAY_VISUAL_SCALE,
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
    elixirCost: card.elixirCost,
    balance: buildBalanceEntry(cardId),
    fw: sheet.frameWidth ?? FRAME_W,
    fh: sheet.frameHeight ?? FRAME_H,
    path: sheet.path || bundle.editorSpritePath,
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

  if (entry.elixirCost !== undefined) parts.push(`elixirCost:${entry.elixirCost}`)
  if (entry.balance) parts.push(`balance:${JSON.stringify(entry.balance)}`)
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
    `const CARD_DISPLAY_VISUAL_SCALE = ${JSON.stringify(constants.cardDisplayVisualScale, null, 2)}`,
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

export const MAP_EDITOR_LAYOUT_SYNC_START = '// @generated map-editor-layout-sync-start'
export const MAP_EDITOR_LAYOUT_SYNC_END = '// @generated map-editor-layout-sync-end'
export const MAP_EDITOR_KING_VISUAL_SYNC_START = '// @generated map-editor-king-visual-sync-start'
export const MAP_EDITOR_KING_VISUAL_SYNC_END = '// @generated map-editor-king-visual-sync-end'
export const MAP_EDITOR_KING_GARRISON_SYNC_START = '// @generated map-editor-king-garrison-sync-start'
export const MAP_EDITOR_KING_GARRISON_SYNC_END = '// @generated map-editor-king-garrison-sync-end'
export const MAP_EDITOR_KING_UNIT_SYNC_START = '// @generated map-editor-king-unit-sync-start'
export const MAP_EDITOR_KING_UNIT_SYNC_END = '// @generated map-editor-king-unit-sync-end'
export const MAP_EDITOR_SPAWN_SYNC_START = '// @generated map-editor-spawn-sync-start'
export const MAP_EDITOR_SPAWN_SYNC_END = '// @generated map-editor-spawn-sync-end'
export const MAP_EDITOR_SYNC_START = '// @generated map-editor-sync-start'
export const MAP_EDITOR_SYNC_END = '// @generated map-editor-sync-end'

export function formatDefaultSpawnZonesBlock(): string {
  return [
    MAP_EDITOR_SPAWN_SYNC_START,
    '// Mirrors SpawnZones.ts buildClashStyleSpawnZones() — run: npm run sync:map-editor',
    `const DEFAULT_SPAWN_ZONES = ${JSON.stringify(buildClashStyleSpawnZones(), null, 2)}`,
    MAP_EDITOR_SPAWN_SYNC_END,
  ].join('\n')
}

export function formatMapEditorLayoutBlock(): string {
  const layout = buildMapEditorLayoutConstants()
  return [
    MAP_EDITOR_LAYOUT_SYNC_START,
    '// Mirrors GameConstants.ts arena geometry + tower layout — run: npm run sync:map-editor',
    `const COLS = ${layout.gridCols}`,
    `const ROWS = ${layout.gridRows}`,
    `const GAME_CELL_SIZE = ${layout.gameCellSize}`,
    `const ARENA_FENCE_ROWS = ${layout.arenaFenceRows}`,
    `const ARENA_FENCE_COLS = ${layout.arenaFenceCols}`,
    `const MAP_UNIT_HEIGHT_CELLS = ${layout.unitHeightCells}`,
    `const SPRITE_VISUAL_SCALE = ${layout.spriteVisualScale}`,
    `const DEPLOY_LANE_SPLIT_COL = ${layout.deployLaneSplitCol}`,
    `const KING_LOGIC_COL = ${layout.kingLogicCol}`,
    `const KING_SPRITE_CENTER_OFFSET_X = ${layout.kingSpriteCenterOffsetX}`,
    `const PLAYER_KING_ROW = ${layout.playerKingRow}`,
    `const BOT_KING_ROW = ${layout.botKingRow}`,
    `const PLAYER_TOWER_ROW = ${layout.playerTowerRow}`,
    `const BOT_TOWER_ROW = ${layout.botTowerRow}`,
    `const PLAYER_TOWER_COL_LEFT = ${layout.playerTowerColLeft}`,
    `const PLAYER_TOWER_COL_RIGHT = ${layout.playerTowerColRight}`,
    `const PLAYER_KING_VISUAL_ROW = ${layout.playerKingVisualRow}`,
    `const BOT_KING_VISUAL_ROW = ${layout.botKingVisualRow}`,
    `const BRIDGE_CENTER_COL = ${layout.bridgeCenterCol}`,
    `const BRIDGE_SPAN = ${layout.bridgeSpan}`,
    `const LEFT_BRIDGE_START = ${layout.leftBridgeStart}`,
    `const RIGHT_BRIDGE_START = ${layout.rightBridgeStart}`,
    MAP_EDITOR_LAYOUT_SYNC_END,
  ].join('\n')
}

export function formatMapEditorKingVisualBlock(): string {
  const visual = KING_TOWER_VISUAL_OFFSET_DEFAULTS
  return [
    MAP_EDITOR_KING_VISUAL_SYNC_START,
    '// Mirrors towerGarrison.ts KING_TOWER_VISUAL_OFFSET_DEFAULTS — run: npm run sync:map-editor',
    `const KING_VISUAL_OFFSET_DEFAULT = { botKing: ${visual.botKing}, plyKing: ${visual.plyKing} }`,
    MAP_EDITOR_KING_VISUAL_SYNC_END,
  ].join('\n')
}

export function formatMapEditorKingGarrisonBlock(): string {
  const g = KING_GARRISON_EDITOR_DEFAULTS
  return [
    MAP_EDITOR_KING_GARRISON_SYNC_START,
    '// Mirrors towerGarrison.ts king garrison deck offsets — run: npm run sync:map-editor',
    `const KING_GARRISON_ARCHER_REL_Y = { player: ${g.player.archerRelY}, cpu: ${g.cpu.archerRelY} }`,
    `const KING_GARRISON_CANNON_REL = { relX: { player: ${g.player.cannonRelX}, cpu: ${g.cpu.cannonRelX} }, relY: { player: ${g.player.cannonRelY}, cpu: ${g.cpu.cannonRelY} } }`,
    '',
    'function defaultKingGarrisonSlots(side) {',
    '  const archerRelY = side === \'cpu\' ? KING_GARRISON_ARCHER_REL_Y.cpu : KING_GARRISON_ARCHER_REL_Y.player',
    '  const cannonRelX = side === \'cpu\' ? KING_GARRISON_CANNON_REL.relX.cpu : KING_GARRISON_CANNON_REL.relX.player',
    '  const cannonRelY = side === \'cpu\' ? KING_GARRISON_CANNON_REL.relY.cpu : KING_GARRISON_CANNON_REL.relY.player',
    '  return [',
    '    { label: \'Left deck\',  relX: -0.28, relY: archerRelY, unitId: \'elite_archer\', flipX: false },',
    '    { label: \'Cannon\',     relX: cannonRelX, relY: cannonRelY, unitId: \'cannon\',       flipX: false },',
    '    { label: \'Right deck\', relX: 0.28,  relY: archerRelY, unitId: \'elite_archer\', flipX: true  },',
    '  ]',
    '}',
    '',
    'const liveKingGarrison = {',
    '  king_tower: {',
    '    player: defaultKingGarrisonSlots(\'player\'),',
    '    cpu:    defaultKingGarrisonSlots(\'cpu\'),',
    '  },',
    '}',
    MAP_EDITOR_KING_GARRISON_SYNC_END,
  ].join('\n')
}

export function formatMapEditorKingUnitEditorBlock(): string {
  const player = PLAYER_KING_TOWER_MELEE
  const bot = BOT_KING_TOWER_MELEE
  const visual = KING_TOWER_VISUAL_OFFSET_DEFAULTS
  return [
    MAP_EDITOR_KING_UNIT_SYNC_START,
    '// Mirrors KingTowerMeleeLayout.ts + towerGarrison.ts — run: npm run sync:map-editor',
    `const PLAYER_KING_SLOT_POSITIONS = ${JSON.stringify(player.slotPositions, null, 2)}`,
    `const BOT_KING_SLOT_POSITIONS = ${JSON.stringify(bot.slotPositions, null, 2)}`,
    'liveSlotPositions.king_tower = {',
    '  player: PLAYER_KING_SLOT_POSITIONS.map(p => ({ ...p })),',
    '  cpu: BOT_KING_SLOT_POSITIONS.map(p => ({ ...p })),',
    '}',
    'liveSlotRadii.king_tower = 2.85',
    'liveHbarOffsets.king_tower = { y: -2.7 }',
    'if (liveSlotOffsets.king_tower) {',
    `  liveSlotOffsets.king_tower.player = { x: ${player.slotOriginOffsetCells.x}, y: ${player.slotOriginOffsetCells.y} }`,
    `  liveSlotOffsets.king_tower.cpu = { x: ${bot.slotOriginOffsetCells.x}, y: ${bot.slotOriginOffsetCells.y} }`,
    '}',
    'if (liveTowerVisualOffsets.king_tower) {',
    `  liveTowerVisualOffsets.king_tower.player = { x: 0, y: ${visual.plyKing} }`,
    `  liveTowerVisualOffsets.king_tower.cpu = { x: 0, y: ${visual.botKing} }`,
    '}',
    `liveKingRangeCenterOffsets.king_tower.player = { x: ${player.rangeCenterOffsetCells.x}, y: ${player.rangeCenterOffsetCells.y} }`,
    `liveKingRangeCenterOffsets.king_tower.cpu = { x: ${bot.rangeCenterOffsetCells.x}, y: ${bot.rangeCenterOffsetCells.y} }`,
    `liveKingRangedAttackOffsets.king_tower.player = { x: ${player.rangedAttackPointOffsetCells.x}, y: ${player.rangedAttackPointOffsetCells.y} }`,
    `liveKingRangedAttackOffsets.king_tower.cpu = { x: ${bot.rangedAttackPointOffsetCells.x}, y: ${bot.rangedAttackPointOffsetCells.y} }`,
    MAP_EDITOR_KING_UNIT_SYNC_END,
  ].join('\n')
}

function extractBlock(html: string, startMarker: string, endMarker: string): string | null {
  const start = html.indexOf(startMarker)
  const end = html.indexOf(endMarker)
  if (start < 0 || end < 0 || end <= start) return null
  return html.slice(start, end + endMarker.length).trimEnd()
}

export function extractMapEditorLayoutBlock(html: string): string | null {
  return extractBlock(html, MAP_EDITOR_LAYOUT_SYNC_START, MAP_EDITOR_LAYOUT_SYNC_END)
}

export function extractMapEditorKingVisualBlock(html: string): string | null {
  return extractBlock(html, MAP_EDITOR_KING_VISUAL_SYNC_START, MAP_EDITOR_KING_VISUAL_SYNC_END)
}

export function extractMapEditorKingGarrisonBlock(html: string): string | null {
  return extractBlock(html, MAP_EDITOR_KING_GARRISON_SYNC_START, MAP_EDITOR_KING_GARRISON_SYNC_END)
}

export function extractMapEditorKingUnitEditorBlock(html: string): string | null {
  return extractBlock(html, MAP_EDITOR_KING_UNIT_SYNC_START, MAP_EDITOR_KING_UNIT_SYNC_END)
}

export function extractMapEditorGeneratedBlock(html: string): string | null {
  return extractBlock(html, MAP_EDITOR_SYNC_START, MAP_EDITOR_SYNC_END)
}

export function extractDefaultSpawnZonesBlock(html: string): string | null {
  return extractBlock(html, MAP_EDITOR_SPAWN_SYNC_START, MAP_EDITOR_SPAWN_SYNC_END)
}
