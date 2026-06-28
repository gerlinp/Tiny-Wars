import { Owner } from './types'
import type { GameState } from './GameState'
import type { Vec2 } from './types'
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

export function enemyDeployRows(owner: Owner): { min: number; max: number } {
  return owner === Owner.PLAYER
    ? { min: BOT_DEPLOY_ROW_MIN, max: BOT_DEPLOY_ROW_MAX }
    : { min: PLAYER_DEPLOY_ROW_MIN, max: PLAYER_DEPLOY_ROW_MAX }
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
export function deployOverlayRects(localOwner: Owner, unlocks: LaneUnlocks): DeployOverlayRect[] {
  const friendly = friendlyDeployRows(localOwner)
  const enemy = enemyDeployRows(localOwner)

  const rects: DeployOverlayRect[] = [{
    x: 0,
    y: friendly.min * CELL_SIZE,
    w: GAME_WIDTH,
    h: (friendly.max - friendly.min + 1) * CELL_SIZE,
    kind: 'friendly',
  }]

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

/** True when a troop/building may be placed on this cell for the given owner. */
export function isTroopDeployCell(
  owner: Owner,
  gridPos: Vec2,
  enemyLaneDeploy: Record<Owner, LaneUnlocks>,
): boolean {
  const { x: col, y: row } = gridPos
  const friendly = friendlyDeployRows(owner)
  const enemy = enemyDeployRows(owner)
  const unlocks = enemyLaneDeploy[owner]

  if (row >= friendly.min && row <= friendly.max) return true
  if (row < enemy.min || row > enemy.max) return false
  if (unlocks.left && isCellInLane(col, 'left')) return true
  if (unlocks.right && isCellInLane(col, 'right')) return true
  return false
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

/** World positions for multi-deploy troops — line for small groups, grid cluster for swarms. */
export function troopDeployPositions(center: Vec2, count: number, spreadCells: number): Vec2[] {
  const spreadPx = spreadCells * CELL_SIZE
  if (count === 1) return [center]
  if (count <= 3) {
    return Array.from({ length: count }, (_, i) => ({
      x: center.x + (i - (count - 1) / 2) * spreadPx,
      y: center.y,
    }))
  }

  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  const xStep = spreadPx * 0.65
  const yStep = spreadPx * 0.55
  const positions: Vec2[] = []
  for (let r = 0; r < rows && positions.length < count; r++) {
    for (let c = 0; c < cols && positions.length < count; c++) {
      positions.push({
        x: center.x + (c - (cols - 1) / 2) * xStep,
        y: center.y + (r - (rows - 1) / 2) * yStep,
      })
    }
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
