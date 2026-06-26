import type { Grid } from './Grid'
import type { Vec2 } from './types'
import { UnitType } from './types'
import { gridKey } from './Vector2'

interface Node {
  col: number
  row: number
  g: number
  h: number
  f: number
  parent: Node | null
}

export class Pathfinder {
  constructor(private grid: Grid) {}

  /** Returns world-space waypoints (cell centres) from current position to goal. */
  findPathWorld(fromWorld: Vec2, toWorld: Vec2, unitType: UnitType): Vec2[] {
    if (unitType === UnitType.AIR) return [toWorld]

    const from = this.grid.worldToCell(fromWorld.x, fromWorld.y)
    const to = this.grid.worldToCell(toWorld.x, toWorld.y)
    const gridPath = this.findPath(from, to, unitType)

    return gridPath.map(cell => this.grid.cellToWorld(cell.x, cell.y))
  }

  /**
   * BFS up to `radius` cells to find the nearest walkable cell when a unit
   * is inside a blocked cell (e.g. pushed off a bridge into river).
   */
  private nearestWalkableStart(col: number, row: number, radius = 3): { col: number; row: number } {
    if (this.grid.isWalkable(col, row)) return { col, row }
    for (let r = 1; r <= radius; r++) {
      for (let dc = -r; dc <= r; dc++) {
        for (let dr = -r; dr <= r; dr++) {
          if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue
          if (this.grid.isWalkable(col + dc, row + dr)) return { col: col + dc, row: row + dr }
        }
      }
    }
    return { col, row }
  }

  /**
   * BFS for the nearest walkable cell to a blocked goal (e.g. an approach point that
   * landed inside a tower footprint). Among equidistant candidates, prefers the one
   * closest to the start so the unit stops on its own side of the target instead of
   * pathing around it. Without this, A* never reaches a blocked goal and falls back to
   * a straight line across water, leaving melee units oscillating at the obstacle.
   */
  private nearestWalkableGoal(
    col: number,
    row: number,
    startCol: number,
    startRow: number,
    radius = 3,
  ): { col: number; row: number } {
    if (this.grid.isWalkable(col, row)) return { col, row }
    for (let r = 1; r <= radius; r++) {
      let best: { col: number; row: number } | null = null
      let bestDist = Infinity
      for (let dc = -r; dc <= r; dc++) {
        for (let dr = -r; dr <= r; dr++) {
          if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue
          const c = col + dc
          const rr = row + dr
          if (!this.grid.isWalkable(c, rr)) continue
          const d = (c - startCol) ** 2 + (rr - startRow) ** 2
          if (d < bestDist) {
            bestDist = d
            best = { col: c, row: rr }
          }
        }
      }
      if (best) return best
    }
    return { col, row }
  }

  findPath(from: Vec2, to: Vec2, unitType: UnitType): Vec2[] {
    if (unitType === UnitType.AIR) return [to]

    const rawCol = Math.round(from.x)
    const rawRow = Math.round(from.y)
    const { col: startCol, row: startRow } = this.nearestWalkableStart(rawCol, rawRow)
    const { col: goalCol, row: goalRow } = this.nearestWalkableGoal(
      Math.round(to.x), Math.round(to.y), startCol, startRow,
    )

    if (startCol === goalCol && startRow === goalRow) return []

    const openMap  = new Map<number, Node>()
    const closedSet = new Set<number>()

    const startNode: Node = {
      col: startCol, row: startRow,
      g: 0,
      h: this.heuristic(startCol, startRow, goalCol, goalRow),
      f: 0,
      parent: null,
    }
    startNode.f = startNode.g + startNode.h
    openMap.set(gridKey(startCol, startRow), startNode)

    while (openMap.size > 0) {
      let current: Node | null = null
      for (const node of openMap.values()) {
        if (!current || node.f < current.f) current = node
      }
      if (!current) break

      if (current.col === goalCol && current.row === goalRow) {
        return this.reconstructPath(current)
      }

      openMap.delete(gridKey(current.col, current.row))
      closedSet.add(gridKey(current.col, current.row))

      for (const { col, row, cost } of this.grid.neighbors(current.col, current.row)) {
        const key = gridKey(col, row)
        if (closedSet.has(key)) continue

        const g = current.g + cost
        const existing = openMap.get(key)
        if (!existing || g < existing.g) {
          const h = this.heuristic(col, row, goalCol, goalRow)
          const node: Node = { col, row, g, h, f: g + h, parent: current }
          openMap.set(key, node)
        }
      }

      if (closedSet.size > 2000) break
    }

    return [to]
  }

  private heuristic(ac: number, ar: number, bc: number, br: number): number {
    const dx = Math.abs(ac - bc)
    const dy = Math.abs(ar - br)
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)
  }

  private reconstructPath(node: Node): Vec2[] {
    const path: Vec2[] = []
    let current: Node | null = node
    while (current) {
      path.unshift({ x: current.col, y: current.row })
      current = current.parent
    }
    path.shift()
    return path
  }
}
