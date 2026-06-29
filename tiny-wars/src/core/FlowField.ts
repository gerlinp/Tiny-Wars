import type { Grid } from './Grid'
import type { Vec2 } from './types'
import { CELL_SIZE } from '@data/GameConstants'

const INF = 0x7fffffff
const INV_SQRT2 = 0.7071067811865476

// Cardinal cost 10, diagonal cost 14 (integer approximation of 10√2 ≈ 14.14)
// Using scaled integers avoids floats in the hot BFS loop.
const DIRS = [
  { dc:  0, dr: -1, cost: 10 },
  { dc:  1, dr:  0, cost: 10 },
  { dc:  0, dr:  1, cost: 10 },
  { dc: -1, dr:  0, cost: 10 },
  { dc:  1, dr: -1, cost: 14 },
  { dc:  1, dr:  1, cost: 14 },
  { dc: -1, dr:  1, cost: 14 },
  { dc: -1, dr: -1, cost: 14 },
] as const

// Minimal binary min-heap used by Dijkstra (alternating cost/idx pairs in a flat Int32Array)
class MinHeap {
  private buf: Int32Array
  private len = 0

  constructor(capacity: number) {
    this.buf = new Int32Array(capacity * 2)
  }

  push(cost: number, idx: number): void {
    let i = this.len++
    this.buf[i * 2]     = cost
    this.buf[i * 2 + 1] = idx
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.buf[p * 2]! <= this.buf[i * 2]!) break
      this._swap(p, i)
      i = p
    }
  }

  pop(): { cost: number; idx: number } | null {
    if (this.len === 0) return null
    const cost = this.buf[0]!
    const idx  = this.buf[1]!
    const last = --this.len
    if (last > 0) {
      this.buf[0] = this.buf[last * 2]!
      this.buf[1] = this.buf[last * 2 + 1]!
      let i = 0
      while (true) {
        const l = 2 * i + 1
        const r = l + 1
        let s = i
        if (l < this.len && this.buf[l * 2]! < this.buf[s * 2]!) s = l
        if (r < this.len && this.buf[r * 2]! < this.buf[s * 2]!) s = r
        if (s === i) break
        this._swap(s, i)
        i = s
      }
    }
    return { cost, idx }
  }

  get size(): number { return this.len }

  private _swap(a: number, b: number): void {
    const tc = this.buf[a * 2]!
    const ti = this.buf[a * 2 + 1]!
    this.buf[a * 2]     = this.buf[b * 2]!
    this.buf[a * 2 + 1] = this.buf[b * 2 + 1]!
    this.buf[b * 2]     = tc
    this.buf[b * 2 + 1] = ti
  }
}

/**
 * 8-connected Dijkstra flow field seeded from a set of goal cells.
 * Each walkable cell stores its path cost to the nearest goal and a
 * normalized direction vector pointing toward that goal.
 *
 * Cardinal moves cost 10, diagonal moves cost 14 (≈ 10√2) so units
 * always take the true shortest path — including diagonal movement —
 * rather than stairstepping along grid axes.
 */
export class FlowField {
  private readonly cost: Int32Array
  private readonly dx: Float32Array
  private readonly dy: Float32Array
  private readonly cols: number
  private readonly rows: number

  constructor(grid: Grid, goalCells: readonly Vec2[]) {
    const { cols, rows } = grid
    this.cols = cols
    this.rows = rows
    this.cost = new Int32Array(cols * rows).fill(INF)
    this.dx   = new Float32Array(cols * rows)
    this.dy   = new Float32Array(cols * rows)

    // Heap capacity: each cell can be re-queued up to 8 times (one per incoming direction)
    const heap = new MinHeap(cols * rows * 8)

    for (const { x: col, y: row } of goalCells) {
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue
      const idx = row * cols + col
      if (this.cost[idx] === 0) continue
      this.cost[idx] = 0
      heap.push(0, idx)
    }

    while (heap.size > 0) {
      const node = heap.pop()!
      const { cost: c, idx } = node
      if (c > this.cost[idx]!) continue  // stale entry (cell already settled at lower cost)
      const col = idx % cols
      const row = (idx / cols) | 0

      for (const { dc, dr, cost: edgeCost } of DIRS) {
        const nc = col + dc
        const nr = row + dr
        if (!grid.isWalkable(nc, nr)) continue
        const nidx  = nr * cols + nc
        const newCost = c + edgeCost
        if (this.cost[nidx]! <= newCost) continue
        this.cost[nidx] = newCost
        // Direction stored at neighbor points back toward goal: normalized(-dc, -dr)
        const scale = (dc !== 0 && dr !== 0) ? INV_SQRT2 : 1
        this.dx[nidx] = -dc * scale
        this.dy[nidx] = -dr * scale
        heap.push(newCost, nidx)
      }
    }
  }

  /**
   * Path cost (in 10-scaled units) to the nearest goal from world position (wx, wy).
   * Returns Infinity when the cell is unreachable.
   * Note: costs are scaled (cardinal = 10, diagonal = 14); use only for relative comparisons
   * or divide by 10 to approximate hop count.
   */
  costAt(wx: number, wy: number): number {
    const col = Math.max(0, Math.min(this.cols - 1, (wx / CELL_SIZE) | 0))
    const row = Math.max(0, Math.min(this.rows - 1, (wy / CELL_SIZE) | 0))
    const c = this.cost[row * this.cols + col]!
    return c === INF ? Infinity : c
  }

  /**
   * Normalized navigation direction toward the nearest goal at world position (wx, wy).
   * Returns null when already at a goal cell (cost 0) or unreachable.
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
    return { x: vx, y: vy }
  }
}
