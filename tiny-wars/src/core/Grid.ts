import {
  GRID_COLS, GRID_ROWS, CELL_SIZE,
  RIVER_ROW_START, RIVER_ROW_END, BRIDGE_COLS,
} from '@data/GameConstants'
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
    for (let row = RIVER_ROW_START; row <= RIVER_ROW_END; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        this.walkable[row * GRID_COLS + col] = 0
      }
    }
    // Cut bridge openings
    for (const bridgeCol of BRIDGE_COLS) {
      for (let row = RIVER_ROW_START; row <= RIVER_ROW_END; row++) {
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

  neighbors(col: number, row: number): Array<{ col: number; row: number }> {
    const result: Array<{ col: number; row: number }> = []
    const dirs = [{ dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 }]
    for (const { dc, dr } of dirs) {
      const nc = col + dc
      const nr = row + dr
      if (this.isWalkable(nc, nr)) result.push({ col: nc, row: nr })
    }
    return result
  }
}
