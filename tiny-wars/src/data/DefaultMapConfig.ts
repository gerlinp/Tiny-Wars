import type { MapConfig } from './MapConfig'
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
  terrainOverrides: {},
  decorations: [],
}
