export interface DecorationItem {
  id: string
  col: number
  row: number
}

/** Per-tower layout offset from grid centre (game pixels, CELL_SIZE=20). */
export interface TowerLayoutOffset {
  offsetX?: number
  offsetY?: number
}

export type TowerHealthBarKey =
  | 'botKing'
  | 'botLeft'
  | 'botRight'
  | 'plyKing'
  | 'plyLeft'
  | 'plyRight'

export interface MapConfig {
  version: number
  riverRowStart: number
  riverRowEnd: number
  leftBridgeCols: readonly [number, number]
  rightBridgeCols: readonly [number, number]
  playerKingRow: number
  playerKingCol: number
  playerTowerRow: number
  playerTowerCols: readonly [number, number]
  botKingRow: number
  botKingCol: number
  botTowerRow: number
  botTowerCols: readonly [number, number]
  playerDeployRowMin: number
  botDeployRowMax: number
  terrainOverrides: Record<string, 'water' | 'grass'>
  decorations?: DecorationItem[]
  /** Optional overrides from map-editor — offsets from tower logic centre (px). */
  towerHealthBars?: Partial<Record<TowerHealthBarKey, TowerLayoutOffset>>
  /** Sprite centre offset from tower logic centre (px). */
  towerVisualOffsets?: Partial<Record<TowerHealthBarKey, TowerLayoutOffset>>
}
