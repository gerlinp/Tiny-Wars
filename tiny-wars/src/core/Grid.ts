import {
  GRID_COLS, GRID_ROWS, CELL_SIZE,
  RIVER_ROW_START, RIVER_ROW_END, BRIDGE_COLS,
} from '@data/GameConstants'
import { getActiveMapConfig } from '@data/ActiveMapConfig'
import type { Vec2 } from './types'

export class Grid {
  readonly cols = GRID_COLS
  readonly rows = GRID_ROWS

  private walkable: Uint8Array

  constructor() {
    this.walkable = new Uint8Array(GRID_COLS * GRID_ROWS).fill(1)
    this.buildRiver()
  }

  private buildRiver(): void {
    const config = getActiveMapConfig()
    const riverStart = config ? config.riverRowStart : RIVER_ROW_START
    const riverEnd   = config ? config.riverRowEnd   : RIVER_ROW_END
    const bridgeCols = config
      ? [...config.leftBridgeCols, ...config.rightBridgeCols]
      : BRIDGE_COLS

    for (let row = riverStart; row <= riverEnd; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        this.walkable[row * GRID_COLS + col] = 0
      }
    }
    // Cut bridge openings
    for (const bridgeCol of bridgeCols) {
      for (let row = riverStart; row <= riverEnd; row++) {
        this.walkable[row * GRID_COLS + bridgeCol] = 1
      }
    }
  }

  isWalkable(col: number, row: number): boolean {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false
    return this.walkable[row * GRID_COLS + col] === 1
  }

  blockCell(col: number, row: number): void {
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      this.walkable[row * GRID_COLS + col] = 0
    }
  }

  unblockCell(col: number, row: number): void {
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      // Only unblock if not in river (outside bridge cols)
      const inRiver = row >= RIVER_ROW_START && row <= RIVER_ROW_END
      const isBridge = (BRIDGE_COLS as readonly number[]).includes(col)
      if (!inRiver || isBridge) {
        this.walkable[row * GRID_COLS + col] = 1
      }
    }
  }

  isRiverCell(col: number, row: number): boolean {
    const inRiver = row >= RIVER_ROW_START && row <= RIVER_ROW_END
    const isBridge = (BRIDGE_COLS as readonly number[]).includes(col)
    return inRiver && !isBridge
  }

  /** Grid cell → world pixel position (cell centre) */
  cellToWorld(col: number, row: number): Vec2 {
    return {
      x: col * CELL_SIZE + CELL_SIZE / 2,
      y: row * CELL_SIZE + CELL_SIZE / 2,
    }
  }

  /** World pixel → nearest grid cell (clamped) */
  worldToCell(wx: number, wy: number): Vec2 {
    return {
      x: Math.max(0, Math.min(GRID_COLS - 1, Math.floor(wx / CELL_SIZE))),
      y: Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(wy / CELL_SIZE))),
    }
  }

  /** 4- and 8-connected neighbors for pathfinding */
  neighbors(col: number, row: number, allowDiagonal = true): Array<{ col: number; row: number; cost: number }> {
    const result: Array<{ col: number; row: number; cost: number }> = []
    const cardinals = [{ dc: 0, dr: -1 }, { dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }]
    for (const { dc, dr } of cardinals) {
      const nc = col + dc
      const nr = row + dr
      if (this.isWalkable(nc, nr)) result.push({ col: nc, row: nr, cost: 1 })
    }

    if (!allowDiagonal) return result

    const diagonals = [{ dc: 1, dr: -1 }, { dc: 1, dr: 1 }, { dc: -1, dr: 1 }, { dc: -1, dr: -1 }]
    for (const { dc, dr } of diagonals) {
      const nc = col + dc
      const nr = row + dr
      if (!this.isWalkable(nc, nr)) continue
      // Prevent cutting corners through blocked cells
      if (!this.isWalkable(col + dc, row) || !this.isWalkable(col, row + dr)) continue
      result.push({ col: nc, row: nr, cost: Math.SQRT2 })
    }
    return result
  }
}
