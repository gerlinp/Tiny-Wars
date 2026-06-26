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
}
