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

  findPath(from: Vec2, to: Vec2, unitType: UnitType): Vec2[] {
    // Air units move in a straight line — no pathfinding needed
    if (unitType === UnitType.AIR) {
      return [to]
    }

    const startCol = Math.round(from.x)
    const startRow = Math.round(from.y)
    const goalCol  = Math.round(to.x)
    const goalRow  = Math.round(to.y)

    if (startCol === goalCol && startRow === goalRow) return []

    // Use integer grid coords for the open/closed sets
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
      // Find node with lowest f in open set
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

      for (const { col, row } of this.grid.neighbors(current.col, current.row)) {
        const key = gridKey(col, row)
        if (closedSet.has(key)) continue

        const g = current.g + 1
        const existing = openMap.get(key)
        if (!existing || g < existing.g) {
          const h = this.heuristic(col, row, goalCol, goalRow)
          const node: Node = { col, row, g, h, f: g + h, parent: current }
          openMap.set(key, node)
        }
      }

      // Safety cap — prevent infinite loops on very large maps
      if (closedSet.size > 2000) break
    }

    // No path found — return direct target (unit will be stuck but won't crash)
    return [to]
  }

  private heuristic(ac: number, ar: number, bc: number, br: number): number {
    return Math.abs(ac - bc) + Math.abs(ar - br)
  }

  private reconstructPath(node: Node): Vec2[] {
    const path: Vec2[] = []
    let current: Node | null = node
    while (current) {
      path.unshift({ x: current.col, y: current.row })
      current = current.parent
    }
    // Drop the start cell (the unit is already there)
    path.shift()
    return path
  }
}
