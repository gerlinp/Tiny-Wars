import { FlowField } from './FlowField'
import type { Grid } from './Grid'
import type { GameState } from './GameState'
import type { Tower } from './entities/Tower'
import type { Owner, Vec2 } from './types'
import { isAttackableTower } from './TargetSelection'
import { entityCollisionCenter, entityHalfExtents } from './EntityGeometry'
import { CELL_SIZE } from '@data/GameConstants'

/**
 * Manages one flow field per living, attackable enemy tower.
 *
 * Flow fields replace per-unit A* for all long-range tower-march navigation:
 * - One BFS per tower, computed once, sampled by every unit each tick.
 * - Distances are path-accurate (not Euclidean), so units always pick the
 *   reachable tower that requires fewer actual walking steps.
 * - River crossings are handled automatically by the BFS routing through bridges.
 */
export class FlowFieldManager {
  private fields = new Map<string, FlowField>()

  constructor(private readonly grid: Grid) {}

  /** Recompute all fields from the current tower layout. Call when grid changes. */
  rebuild(state: GameState): void {
    this.fields.clear()
    for (const tower of state.towers.values()) {
      if (!tower.isAlive) continue
      this.fields.set(tower.id, new FlowField(this.grid, this.approachCells(tower)))
    }
  }

  /** Walkable cells forming the ring just outside the tower footprint — BFS goal cells. */
  private approachCells(tower: Tower): Vec2[] {
    const center = entityCollisionCenter(tower)
    const half   = entityHalfExtents(tower)

    const minCol = Math.floor((center.x - half.halfW) / CELL_SIZE)
    const maxCol = Math.ceil( (center.x + half.halfW) / CELL_SIZE) - 1
    const minRow = Math.floor((center.y - half.halfH) / CELL_SIZE)
    const maxRow = Math.ceil( (center.y + half.halfH) / CELL_SIZE) - 1

    const cells: Vec2[] = []
    for (let col = minCol - 1; col <= maxCol + 1; col++) {
      for (let row = minRow - 1; row <= maxRow + 1; row++) {
        // Only the border ring around the footprint
        if (col >= minCol && col <= maxCol && row >= minRow && row <= maxRow) continue
        if (this.grid.isWalkable(col, row)) cells.push({ x: col, y: row })
      }
    }

    // Fallback: tower centre cell (handles edge cases like tiny grids in tests)
    if (cells.length === 0) {
      cells.push({
        x: Math.max(0, Math.min(this.grid.cols - 1, (center.x / CELL_SIZE) | 0)),
        y: Math.max(0, Math.min(this.grid.rows - 1, (center.y / CELL_SIZE) | 0)),
      })
    }

    return cells
  }

  /**
   * Return the enemy tower with the lowest BFS path-cost from `fromPos`.
   * Correctly prefers same-side princess towers even when a cross-river tower
   * appears closer by Euclidean distance.
   */
  nearestEnemyTower(state: GameState, fromPos: Vec2, myOwner: Owner): Tower | null {
    let best: Tower | null = null
    let bestCost = Infinity

    for (const tower of state.towers.values()) {
      if (tower.owner === myOwner || !tower.isAlive) continue
      if (!isAttackableTower(tower)) continue
      const field = this.fields.get(tower.id)
      if (!field) continue
      const cost = field.costAt(fromPos.x, fromPos.y)
      if (cost < bestCost) {
        bestCost = cost
        best = tower
      }
    }

    return best
  }

  /**
   * Navigation direction at (wx, wy) toward the given tower.
   * Returns null when already adjacent to the goal or the tower is unreachable.
   */
  directionTo(towerId: string, wx: number, wy: number): Vec2 | null {
    return this.fields.get(towerId)?.directionAt(wx, wy) ?? null
  }

  /** BFS path cost (in cells) to a specific tower. Returns Infinity if unknown or unreachable. */
  costTo(towerId: string, wx: number, wy: number): number {
    return this.fields.get(towerId)?.costAt(wx, wy) ?? Infinity
  }

  hasField(towerId: string): boolean {
    return this.fields.has(towerId)
  }
}
