import { FlowField } from './FlowField'
import type { Grid } from './Grid'
import type { GameState } from './GameState'
import type { Tower } from './entities/Tower'
import type { Owner, Vec2 } from './types'
import { isAttackableTower } from './TargetSelection'
import { BRIDGE_CENTER_COL, CELL_SIZE } from '@data/GameConstants'

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

  /** Walkable cells adjacent to the tower's actual grid footprint — BFS goal cells. */
  private approachCells(tower: Tower): Vec2[] {
    const occupied = new Set<string>()
    for (const { x, y } of tower.blockedCells) occupied.add(`${x},${y}`)

    const seen = new Set<string>()
    const cells: Vec2[] = []
    const dirs = [{ dc: 0, dr: -1 }, { dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }]

    for (const { x: col, y: row } of tower.blockedCells) {
      for (const { dc, dr } of dirs) {
        const nc = col + dc
        const nr = row + dr
        const key = `${nc},${nr}`
        if (occupied.has(key) || seen.has(key)) continue
        if (!this.grid.isWalkable(nc, nr)) continue
        seen.add(key)
        cells.push({ x: nc, y: nr })
      }
    }

    // Fallback for edge cases (tiny grids in tests)
    if (cells.length === 0 && tower.blockedCells.length > 0) {
      const { x, y } = tower.blockedCells[0]!
      cells.push({ x, y })
    }

    return cells
  }

  /**
   * Return the enemy tower that should be the march objective from `fromPos`.
   *
   * Lane priority (left/right): units stay on their spawn lane and target the
   * princess tower on that side. They only march toward the king once that
   * side's princess is gone. Cross-side princess towers are never targeted
   * as the primary march goal.
   */
  nearestEnemyTower(
    state: GameState,
    fromPos: Vec2,
    myOwner: Owner,
    preferredSide?: 'left' | 'right',
  ): Tower | null {
    const centerX = BRIDGE_CENTER_COL * CELL_SIZE

    let kingTower: Tower | null = null
    let kingCost = Infinity
    let sidePrincess: Tower | null = null
    let sidePrincessCost = Infinity
    let anyPrincess: Tower | null = null
    let anyPrincessCost = Infinity

    const unitOnLeft = preferredSide
      ? preferredSide === 'left'
      : fromPos.x < centerX

    for (const tower of state.towers.values()) {
      if (tower.owner === myOwner || !tower.isAlive) continue
      const field = this.fields.get(tower.id)
      if (!field) continue
      const cost = field.costAt(fromPos.x, fromPos.y)
      if (cost >= Infinity) continue

      if (tower.isKing) {
        // King is always a valid march destination once alive — isActive() only gates shooting.
        // This prevents the 1-tick window where the princess just died but resolveDeaths hasn't
        // run yet, which would otherwise cause units to target the cross-side princess instead.
        if (cost < kingCost) { kingCost = cost; kingTower = tower }
      } else {
        if (!isAttackableTower(tower)) continue  // princess towers are always active; safety check
        const towerOnLeft = tower.position.x < centerX
        if (towerOnLeft === unitOnLeft && cost < sidePrincessCost) {
          sidePrincessCost = cost; sidePrincess = tower
        }
        if (cost < anyPrincessCost) { anyPrincessCost = cost; anyPrincess = tower }
      }
    }

    // Priority: same-side princess → king (once unlocked) → fallback cross-side
    if (sidePrincess) return sidePrincess
    if (kingTower) return kingTower
    return anyPrincess
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
