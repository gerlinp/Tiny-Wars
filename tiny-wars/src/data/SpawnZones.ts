import type { MapConfig } from './MapConfig'
import {
  BOT_DEPLOY_ROW_MIN,
  BOT_DEPLOY_ROW_MAX,
  PLAYER_DEPLOY_ROW_MIN,
  PLAYER_DEPLOY_ROW_MAX,
  DEPLOY_LANE_SPLIT_COL,
  GRID_COLS,
  ARENA_FENCE_COLS,
  ARENA_FENCE_ROWS,
  GRID_ROWS,
} from './GameConstants'

export type SpawnZoneType = 'base' | 'left' | 'right'
export type SpawnZoneMap = Record<string, SpawnZoneType>

export function spawnZoneCellKey(col: number, row: number): string {
  return `${col},${row}`
}

export function spawnZoneAt(
  map: SpawnZoneMap | undefined,
  col: number,
  row: number,
): SpawnZoneType | undefined {
  return map?.[spawnZoneCellKey(col, row)]
}

export function hasSpawnZoneMap(map: SpawnZoneMap | undefined): map is SpawnZoneMap {
  return map !== undefined && Object.keys(map).length > 0
}

/** True when this enemy-half cell unlocks after the given lane tower falls. */
export function isPaintedEnemyUnlockCell(
  map: SpawnZoneMap,
  col: number,
  row: number,
  lane: 'left' | 'right',
  enemyRowMin: number,
  enemyRowMax: number,
): boolean {
  if (row < enemyRowMin || row > enemyRowMax) return false
  return spawnZoneAt(map, col, row) === lane
}

/** Fallback when map.json has no painted spawnZones — full lane band on enemy half. */
export function buildFallbackSpawnZones(): SpawnZoneMap {
  const zones: SpawnZoneMap = {}
  const colMin = ARENA_FENCE_COLS
  const colMax = GRID_COLS - ARENA_FENCE_COLS - 1

  for (let row = PLAYER_DEPLOY_ROW_MIN; row <= PLAYER_DEPLOY_ROW_MAX; row++) {
    for (let col = colMin; col <= colMax; col++) {
      zones[spawnZoneCellKey(col, row)] = 'base'
    }
  }

  for (let row = BOT_DEPLOY_ROW_MIN; row <= BOT_DEPLOY_ROW_MAX; row++) {
    for (let col = colMin; col <= colMax; col++) {
      zones[spawnZoneCellKey(col, row)] = col < DEPLOY_LANE_SPLIT_COL ? 'left' : 'right'
    }
  }

  return zones
}

/** Clash-style painted zones for map.json when no custom export exists. */
export function buildClashStyleSpawnZones(): SpawnZoneMap {
  const zones: SpawnZoneMap = {}
  const colMin = ARENA_FENCE_COLS
  const colMax = GRID_COLS - ARENA_FENCE_COLS - 1

  for (let row = PLAYER_DEPLOY_ROW_MIN; row <= PLAYER_DEPLOY_ROW_MAX; row++) {
    for (let col = colMin; col <= colMax; col++) {
      zones[spawnZoneCellKey(col, row)] = 'base'
    }
  }

  for (let row = BOT_DEPLOY_ROW_MIN; row <= BOT_DEPLOY_ROW_MAX; row++) {
    const depth = BOT_DEPLOY_ROW_MAX - row
    const leftEdge = colMin
    const leftInner = Math.min(9, colMin + 2 + Math.floor(depth * 0.45))
    const rightInner = Math.max(14, colMax - 2 - Math.floor(depth * 0.45))
    const rightEdge = colMax

    for (let col = colMin; col <= colMax; col++) {
      const key = spawnZoneCellKey(col, row)
      if (col <= leftInner) zones[key] = 'left'
      else if (col >= rightInner) zones[key] = 'right'
      else zones[key] = 'base'
    }

    // Keep outer fence columns aligned with lane unlock on shallow rows
    void leftEdge
    void rightEdge
  }

  return zones
}

export function spawnZonesFromConfig(config: MapConfig | null | undefined): SpawnZoneMap | undefined {
  if (hasSpawnZoneMap(config?.spawnZones)) return config!.spawnZones
  return undefined
}

/** Enemy-half unlock cells to highlight when lane towers fall. */
export function enemyUnlockOverlayCells(
  map: SpawnZoneMap,
  enemyRowMin: number,
  enemyRowMax: number,
  unlocks: { left: boolean; right: boolean },
): Array<{ col: number; row: number }> {
  const cells: Array<{ col: number; row: number }> = []
  for (const [key, zoneType] of Object.entries(map)) {
    if (zoneType !== 'left' && zoneType !== 'right') continue
    if (zoneType === 'left' && !unlocks.left) continue
    if (zoneType === 'right' && !unlocks.right) continue
    const [col, row] = key.split(',').map(Number)
    if (row < enemyRowMin || row > enemyRowMax) continue
    if (col < ARENA_FENCE_COLS || col >= GRID_COLS - ARENA_FENCE_COLS) continue
    if (row < ARENA_FENCE_ROWS || row >= GRID_ROWS - ARENA_FENCE_ROWS) continue
    cells.push({ col, row })
  }
  return cells
}
