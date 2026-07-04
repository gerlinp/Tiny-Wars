import type { MapConfig } from './MapConfig'
import { buildClashStyleSpawnZones } from './SpawnZones'
import {
  RIVER_ROW_START,
  RIVER_ROW_END,
  LEFT_BRIDGE_COLS,
  RIGHT_BRIDGE_COLS,
  PLAYER_KING_ROW,
  PLAYER_KING_COL,
  PLAYER_TOWER_ROW,
  PLAYER_TOWER_COLS,
  BOT_KING_ROW,
  BOT_KING_COL,
  BOT_TOWER_ROW,
  BOT_TOWER_COLS,
  PLAYER_DEPLOY_ROW_MIN,
  BOT_DEPLOY_ROW_MAX,
} from './GameConstants'

/**
 * CR-style path network: a lane down each princess tower column from tower to
 * bridge on both halves, joined by a horizontal connector along each princess
 * row (running in front of the king). Roads render with the road tileset and
 * pull ground-unit navigation via NAV_TERRAIN_COST.
 */
export function buildDefaultRoadOverrides(): Record<string, 'road'> {
  const roads: Record<string, 'road'> = {}
  const paint = (col: number, row: number) => { roads[`${col},${row}`] = 'road' }

  for (const laneCol of PLAYER_TOWER_COLS) {
    // Vertical lanes — princess row to river bank on each half
    for (let row = BOT_TOWER_ROW; row < RIVER_ROW_START; row++) paint(laneCol, row)
    for (let row = RIVER_ROW_END + 1; row <= PLAYER_TOWER_ROW; row++) paint(laneCol, row)
  }

  // Horizontal connectors between the lanes, along each princess row
  const [leftCol, rightCol] = PLAYER_TOWER_COLS
  for (let col = leftCol; col <= rightCol; col++) {
    paint(col, BOT_TOWER_ROW)
    paint(col, PLAYER_TOWER_ROW)
  }

  return roads
}

/** Built-in arena layout when map.json is missing or fails to load. */
export const DEFAULT_MAP_CONFIG: MapConfig = {
  version: 1,
  riverRowStart: RIVER_ROW_START,
  riverRowEnd: RIVER_ROW_END,
  leftBridgeCols: LEFT_BRIDGE_COLS,
  rightBridgeCols: RIGHT_BRIDGE_COLS,
  playerKingRow: PLAYER_KING_ROW,
  playerKingCol: PLAYER_KING_COL,
  playerTowerRow: PLAYER_TOWER_ROW,
  playerTowerCols: PLAYER_TOWER_COLS,
  botKingRow: BOT_KING_ROW,
  botKingCol: BOT_KING_COL,
  botTowerRow: BOT_TOWER_ROW,
  botTowerCols: BOT_TOWER_COLS,
  playerDeployRowMin: PLAYER_DEPLOY_ROW_MIN,
  botDeployRowMax: BOT_DEPLOY_ROW_MAX,
  spawnZones: buildClashStyleSpawnZones(),
  terrainOverrides: buildDefaultRoadOverrides(),
  decorations: [],
}
