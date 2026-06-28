import type { Grid } from './Grid'
import type { Vec2 } from './types'
import { CELL_SIZE } from '@data/GameConstants'

const INF = 0x7fffffff

const DIRS = [
  { dc:  0, dr: -1 },
  { dc:  1, dr:  0 },
  { dc:  0, dr:  1 },
  { dc: -1, dr:  0 },
] as const

/**
 * 4-connected Dijkstra flow field seeded from a set of goal cells.
 * Each walkable cell stores its BFS distance to the nearest goal and
 * a unit-direction vector pointing toward that goal.
 */
export class FlowField {
  private readonly cost: Int32Array
  private readonly dx: Int8Array
  private readonly dy: Int8Array
  private readonly cols: number
  private readonly rows: number

  constructor(grid: Grid, goalCells: readonly Vec2[]) {
    const { cols, rows } = grid
    this.cols = cols
    this.rows = rows
    this.cost = new Int32Array(cols * rows).fill(INF)
    this.dx   = new Int8Array(cols * rows)
    this.dy   = new Int8Array(cols * rows)

    const queue: number[] = []

    for (const { x: col, y: row } of goalCells) {
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue
      const idx = row * cols + col
      if (this.cost[idx] === 0) continue
      this.cost[idx] = 0
      this.dx[idx]   = 0
      this.dy[idx]   = 0
      queue.push(idx)
    }

    let head = 0
    while (head < queue.length) {
      const idx = queue[head++]!
      const col = idx % cols
      const row = (idx / cols) | 0
      const nextCost = this.cost[idx]! + 1

      for (const { dc, dr } of DIRS) {
        const nc = col + dc
        const nr = row + dr
        if (!grid.isWalkable(nc, nr)) continue
        const nidx = nr * cols + nc
        if (this.cost[nidx]! <= nextCost) continue
        this.cost[nidx] = nextCost
        // Direction from this neighbor back toward the goal = -dc, -dr
        this.dx[nidx] = -dc as -1 | 0 | 1
        this.dy[nidx] = -dr as -1 | 0 | 1
        queue.push(nidx)
      }
    }
  }

  /** BFS hop count to nearest goal cell. Returns Infinity when unreachable. */
  costAt(wx: number, wy: number): number {
    const col = Math.max(0, Math.min(this.cols - 1, (wx / CELL_SIZE) | 0))
    const row = Math.max(0, Math.min(this.rows - 1, (wy / CELL_SIZE) | 0))
    const c = this.cost[row * this.cols + col]!
    return c === INF ? Infinity : c
  }

  /**
   * Navigation direction toward the nearest goal at world position (wx, wy).
   * Returns null when already at goal (cost=0) or unreachable.
   */
  directionAt(wx: number, wy: number): Vec2 | null {
    const col = Math.max(0, Math.min(this.cols - 1, (wx / CELL_SIZE) | 0))
    const row = Math.max(0, Math.min(this.rows - 1, (wy / CELL_SIZE) | 0))
    const idx = row * this.cols + col
    const c = this.cost[idx]!
    if (c === INF || c === 0) return null
    const vx = this.dx[idx]!
    const vy = this.dy[idx]!
    if (vx === 0 && vy === 0) return null
    return { x: vx, y: vy }  // already unit-length for 4-connected cardinal dirs
  }
}
