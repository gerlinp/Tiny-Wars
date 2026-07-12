import { Owner } from './types'
import type { GameState } from './GameState'
import type { Vec2 } from './types'
import { getActiveMapConfig } from '@data/ActiveMapConfig'
import {
  hasSpawnZoneMap,
  isPaintedEnemyUnlockCell,
  enemyUnlockOverlayCells,
  spawnZonesFromConfig,
  type SpawnZoneMap,
} from '@data/SpawnZones'
import {
  CELL_SIZE,
  GAME_WIDTH,
  GRID_COLS,
  GRID_ROWS,
  PLAYER_DEPLOY_ROW_MIN,
  PLAYER_DEPLOY_ROW_MAX,
  BOT_DEPLOY_ROW_MIN,
  BOT_DEPLOY_ROW_MAX,
  DEPLOY_LANE_SPLIT_COL,
  PLAYER_TOWER_COLS,
  BOT_POCKET_ROW_MIN,
  PLAYER_POCKET_ROW_MAX,
  RIVER_ROW_START,
  RIVER_ROW_END,
  LEFT_BRIDGE_COLS,
  RIGHT_BRIDGE_COLS,
} from '@data/GameConstants'

// ─── DeployPerspective ────────────────────────────────────────────────────────

/**
 * Local human seat for UI/rendering. Vs-bot and online clients always treat
 * themselves as the bottom-side owner (Clash-style). Authoritative sim still
 * uses Owner.PLAYER / Owner.BOT grid rows.
 */
export const LOCAL_OWNER = Owner.PLAYER

export function opponentOf(owner: Owner): Owner {
  return owner === Owner.PLAYER ? Owner.BOT : Owner.PLAYER
}

export function friendlyDeployRows(owner: Owner): { min: number; max: number } {
  return owner === Owner.PLAYER
    ? { min: PLAYER_DEPLOY_ROW_MIN, max: PLAYER_DEPLOY_ROW_MAX }
    : { min: BOT_DEPLOY_ROW_MIN, max: BOT_DEPLOY_ROW_MAX }
}

/** Tower-fall pocket rows — clipped to halfway depth (stops at the fallen tower's row). */
export function enemyDeployRows(owner: Owner): { min: number; max: number } {
  return owner === Owner.PLAYER
    ? { min: Math.max(BOT_DEPLOY_ROW_MIN, BOT_POCKET_ROW_MIN), max: BOT_DEPLOY_ROW_MAX }
    : { min: PLAYER_DEPLOY_ROW_MIN, max: Math.min(PLAYER_DEPLOY_ROW_MAX, PLAYER_POCKET_ROW_MAX) }
}

export function enemyLaneUnlocksFor(state: GameState, owner: Owner): LaneUnlocks {
  return state.enemyLaneDeploy[owner]
}

export interface DeployOverlayRect {
  x: number
  y: number
  w: number
  h: number
  kind: 'friendly' | 'expanded'
}

/** Highlight rectangles from the local player's POV (friendly = bottom). */
export function deployOverlayRects(
  localOwner: Owner,
  unlocks: LaneUnlocks,
  spawnZones?: SpawnZoneMap,
): DeployOverlayRect[] {
  const friendly = friendlyDeployRows(localOwner)
  const enemy = enemyDeployRows(localOwner)
  const zones = spawnZones ?? spawnZonesFromConfig(getActiveMapConfig())

  const rects: DeployOverlayRect[] = [{
    x: 0,
    y: friendly.min * CELL_SIZE,
    w: GAME_WIDTH,
    h: (friendly.max - friendly.min + 1) * CELL_SIZE,
    kind: 'friendly',
  }]

  // Unlocked bridge tiles (CR bridge placement) — same for painted and fallback zones.
  for (let row = RIVER_ROW_START; row <= RIVER_ROW_END; row++) {
    for (const col of [...LEFT_BRIDGE_COLS, ...RIGHT_BRIDGE_COLS]) {
      if (!isUnlockedBridgeCell(col, row, unlocks)) continue
      rects.push({
        x: col * CELL_SIZE,
        y: row * CELL_SIZE,
        w: CELL_SIZE,
        h: CELL_SIZE,
        kind: 'expanded',
      })
    }
  }

  if (hasSpawnZoneMap(zones)) {
    for (const { col, row } of enemyUnlockOverlayCells(zones, enemy.min, enemy.max, unlocks)) {
      rects.push({
        x: col * CELL_SIZE,
        y: row * CELL_SIZE,
        w: CELL_SIZE,
        h: CELL_SIZE,
        kind: 'expanded',
      })
    }
    return rects
  }

  const enemyY = enemy.min * CELL_SIZE
  const enemyH = (enemy.max - enemy.min + 1) * CELL_SIZE

  if (unlocks.left) {
    rects.push({
      x: 0,
      y: enemyY,
      w: DEPLOY_LANE_SPLIT_COL * CELL_SIZE,
      h: enemyH,
      kind: 'expanded',
    })
  }

  if (unlocks.right) {
    rects.push({
      x: DEPLOY_LANE_SPLIT_COL * CELL_SIZE,
      y: enemyY,
      w: GAME_WIDTH - DEPLOY_LANE_SPLIT_COL * CELL_SIZE,
      h: enemyH,
      kind: 'expanded',
    })
  }

  return rects
}

// ─── DeployZones ─────────────────────────────────────────────────────────────

export type TowerLane = 'left' | 'right'

export interface LaneUnlocks {
  left: boolean
  right: boolean
}

export const EMPTY_LANE_UNLOCKS: LaneUnlocks = { left: false, right: false }

export function createEmptyEnemyLaneDeploy(): Record<Owner, LaneUnlocks> {
  return {
    [Owner.PLAYER]: { ...EMPTY_LANE_UNLOCKS },
    [Owner.BOT]: { ...EMPTY_LANE_UNLOCKS },
  }
}

export function towerLaneFromCol(col: number): TowerLane {
  const midpoint = (PLAYER_TOWER_COLS[0] + PLAYER_TOWER_COLS[1]) / 2
  return col < midpoint ? 'left' : 'right'
}

export function isCellInLane(col: number, lane: TowerLane): boolean {
  if (lane === 'left') return col >= 0 && col < DEPLOY_LANE_SPLIT_COL
  return col >= DEPLOY_LANE_SPLIT_COL && col < GRID_COLS
}

/** CR-style bridge placement: once a lane's tower is down, that lane's bridge tiles
 *  (river rows at the bridge columns) become valid deploy cells for the attacker. */
export function isUnlockedBridgeCell(col: number, row: number, unlocks: LaneUnlocks): boolean {
  if (row < RIVER_ROW_START || row > RIVER_ROW_END) return false
  if (unlocks.left && (LEFT_BRIDGE_COLS as readonly number[]).includes(col)) return true
  if (unlocks.right && (RIGHT_BRIDGE_COLS as readonly number[]).includes(col)) return true
  return false
}

function enemyUnlockAllowsDeploy(
  col: number,
  row: number,
  enemy: { min: number; max: number },
  unlocks: LaneUnlocks,
  spawnZones: SpawnZoneMap | undefined,
): boolean {
  if (row < enemy.min || row > enemy.max) return false
  if (hasSpawnZoneMap(spawnZones)) {
    if (unlocks.left && isPaintedEnemyUnlockCell(spawnZones, col, row, 'left', enemy.min, enemy.max)) {
      return true
    }
    if (unlocks.right && isPaintedEnemyUnlockCell(spawnZones, col, row, 'right', enemy.min, enemy.max)) {
      return true
    }
    return false
  }
  if (unlocks.left && isCellInLane(col, 'left')) return true
  if (unlocks.right && isCellInLane(col, 'right')) return true
  return false
}

/** True when a troop/building may be placed on this cell for the given owner. */
export function isTroopDeployCell(
  owner: Owner,
  gridPos: Vec2,
  enemyLaneDeploy: Record<Owner, LaneUnlocks>,
  spawnZones?: SpawnZoneMap,
): boolean {
  const { x: col, y: row } = gridPos
  const friendly = friendlyDeployRows(owner)
  const enemy = enemyDeployRows(owner)
  const unlocks = enemyLaneDeploy[owner]
  const zones = spawnZones ?? spawnZonesFromConfig(getActiveMapConfig())

  if (row >= friendly.min && row <= friendly.max) return true
  if (isUnlockedBridgeCell(col, row, unlocks)) return true
  return enemyUnlockAllowsDeploy(col, row, enemy, unlocks, zones)
}

/** Enumerate valid deploy cells for troops/buildings (for bot AI). */
export function listTroopDeployCells(
  owner: Owner,
  enemyLaneDeploy: Record<Owner, LaneUnlocks>,
): Vec2[] {
  const cells: Vec2[] = []
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const pos = { x, y }
      if (isTroopDeployCell(owner, pos, enemyLaneDeploy)) {
        cells.push(pos)
      }
    }
  }
  return cells
}

// ─── DeployLayout ─────────────────────────────────────────────────────────────

/** Compact circular cluster — small groups on one ring, large swarms fill concentric rings. */
export function troopDeployPositions(center: Vec2, count: number, spreadCells: number): Vec2[] {
  if (count <= 1) return [center]

  const ringRadius = spreadCells * CELL_SIZE * 0.38
  const positions: Vec2[] = []
  let remaining = count

  if (count >= 7) {
    positions.push({ x: center.x, y: center.y })
    remaining--
  }

  let ring = 1
  while (remaining > 0) {
    const slotsOnRing = 6 * ring
    const place = Math.min(remaining, slotsOnRing)
    const radius = ringRadius * ring
    for (let i = 0; i < place; i++) {
      const angle = (i / place) * Math.PI * 2 - Math.PI / 2
      positions.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      })
    }
    remaining -= place
    ring++
  }

  return positions
}

export interface SwarmPortraitLayout {
  offsets: Vec2[]
  /** Scale factor applied to in-world unit height for the portrait box. */
  fitScale: number
}

/**
 * Portrait layout matching in-game swarm overlap — units stay large relative to
 * deploy spacing so the card icon looks like a spawned cluster, not a neat grid.
 */
export function troopSwarmPortraitLayout(
  count: number,
  spreadCells: number,
  boxW: number,
  boxH: number,
  unitW: number,
  unitH: number,
): SwarmPortraitLayout {
  const positions = troopDeployPositions({ x: 0, y: 0 }, count, spreadCells)
  const xs = positions.map(p => p.x)
  const ys = positions.map(p => p.y)
  const spanX = Math.max(...xs) - Math.min(...xs) || spreadCells * CELL_SIZE
  const spanY = Math.max(...ys) - Math.min(...ys) || spreadCells * CELL_SIZE

  const fitScale = Math.min(
    (boxW * 0.88) / (spanX + unitW),
    (boxH * 0.88) / (spanY + unitH),
  )

  return {
    fitScale,
    offsets: positions.map(p => ({ x: p.x * fitScale, y: p.y * fitScale })),
  }
}

/** @deprecated Use {@link troopSwarmPortraitLayout} for overlapping swarm portraits. */
export function troopDeployPortraitOffsets(count: number, spreadCells: number, boxW: number, boxH: number): Vec2[] {
  const positions = troopDeployPositions({ x: 0, y: 0 }, count, spreadCells)
  const xs = positions.map(p => p.x)
  const ys = positions.map(p => p.y)
  const spanX = Math.max(...xs) - Math.min(...xs) || spreadCells * CELL_SIZE
  const spanY = Math.max(...ys) - Math.min(...ys) || spreadCells * CELL_SIZE
  const scale = Math.min((boxW * 0.72) / spanX, (boxH * 0.72) / spanY)
  return positions.map(p => ({ x: p.x * scale, y: p.y * scale }))
}
