import { Entity, nextEntityId } from './Entity'
import { EntityKind, TroopState, UnitType, Owner } from '../types'
import type { EntityStats, Vec2 } from '../types'
import type { GameState } from '../GameState'
import type { Grid } from '../Grid'
import { Pathfinder } from '../Pathfinder'
import {
  approachPointOnSurface,
  resolveEntityOverlap,
  surfaceDistToEntity,
  troopCollisionHalf,
} from '../EntityGeometry'
import { distSq } from '../Vector2'
import {
  followWaypoints,
  isDirectPathWalkable,
  isOppositeRiverBank,
  moveTowardDirect,
  nearestBridgeApproach,
  reachedWorldPoint,
} from '../Movement'
import { CELL_SIZE, TROOP_AGGRO_RANGE_CELLS } from '@data/GameConstants'

const PATH_REPLAN_DIST_SQ = CELL_SIZE * CELL_SIZE * 4

export class Troop extends Entity {
  readonly stats: EntityStats
  state: TroopState = TroopState.WALKING

  private attackCooldownMs = 0

  getAttackCooldownMs(): number {
    return this.attackCooldownMs
  }
  private target: Entity | null = null
  private readonly grid: Grid
  private readonly pathfinder: Pathfinder
  private pathWaypoints: Vec2[] = []
  private pathGoal: Vec2 | null = null
  private lastObjectiveId: string | null = null

  constructor(owner: Owner, stats: EntityStats, position: Vec2, grid: Grid, cardId: string) {
    super(nextEntityId(), owner, EntityKind.TROOP, position, stats.maxHp, cardId)
    this.stats = stats
    this.grid = grid
    this.pathfinder = new Pathfinder(grid)
  }

  tick(deltaMs: number, state: GameState): void {
    if (!this.isAlive) { this.state = TroopState.DEAD; return }

    if (this.attackCooldownMs > 0) this.attackCooldownMs -= deltaMs

    if (this.target && !this.target.isAlive) this.target = null

    if (!this.target) {
      this.target = this.acquireTarget(state)
    }

    if (this.target) {
      const attackReach = this.stats.attackRange * CELL_SIZE
      const dist = Math.sqrt(distSq(this.position, this.target.position))
      if (dist <= attackReach) {
        this.state = TroopState.ATTACKING
        this.clearPath()
        this.trackObjective(this.target)
        if (this.attackCooldownMs <= 0) {
          this.target.takeDamage(this.stats.damage)
          state.events.push({
            type: 'DAMAGE',
            targetId: this.target.id,
            amount: this.stats.damage,
            attackerId: this.id,
          })
          this.attackCooldownMs = 1000 / this.stats.attackRate
          if (!this.target.isAlive) this.target = null
        }
        return
      }

      this.state = TroopState.WALKING
      this.trackObjective(this.target)
      this.moveFree(deltaMs, this.moveGoalFor(this.target), state)
      return
    }

    this.state = TroopState.WALKING
    const marchObjective = this.getMarchObjective(state)
    if (marchObjective) {
      this.trackObjective(marchObjective)
      this.moveFree(deltaMs, this.moveGoalFor(marchObjective), state)
    }
  }

  private trackObjective(entity: Entity | null): void {
    const id = entity?.id ?? null
    if (id !== this.lastObjectiveId) {
      this.lastObjectiveId = id
      this.clearPath()
    }
  }

  private aggroRangePx(): number {
    return this.aggroRangeCells() * CELL_SIZE
  }

  private moveGoalFor(target: Entity): Vec2 {
    if (target.kind === EntityKind.BUILDING || target.kind === EntityKind.TOWER) {
      return approachPointOnSurface(this.position, target)
    }
    return target.position
  }

  /** 360° movement — pathfind proactively around the river, always at full speed. */
  private moveFree(deltaMs: number, goal: Vec2, state: GameState): void {
    const speed = (this.stats.speed * CELL_SIZE * deltaMs) / 1000

    if (this.stats.unitType === UnitType.AIR) {
      moveTowardDirect(this.position, goal, speed)
      return
    }

    const mustPath = isOppositeRiverBank(this.position, goal) ||
      !isDirectPathWalkable(this.grid, this.position, goal) ||
      this.hasEnemyBuildingInVision(state)

    if (mustPath) {
      if (this.needsReplan(goal)) this.replanPath(goal)
      followWaypoints(this.position, this.pathWaypoints, goal, speed)
      this.resolveCollisions(state)
      return
    }

    this.clearPath()
    moveTowardDirect(this.position, goal, speed)
    this.resolveCollisions(state)
  }

  private resolveCollisions(state: GameState): void {
    const half = troopCollisionHalf().halfW
    for (const entity of state.entities.values()) {
      if (!entity.isAlive || entity.kind !== EntityKind.BUILDING) continue
      if (entity.owner === this.owner) continue
      resolveEntityOverlap(this.position, half, entity)
    }
  }

  private needsReplan(goal: Vec2): boolean {
    if (this.pathWaypoints.length === 0) return true
    if (!this.pathGoal) return true
    const dx = this.pathGoal.x - goal.x
    const dy = this.pathGoal.y - goal.y
    if (dx * dx + dy * dy > PATH_REPLAN_DIST_SQ) return true

    // Drop passed waypoints
    while (this.pathWaypoints.length > 0 && reachedWorldPoint(this.position, this.pathWaypoints[0]!)) {
      this.pathWaypoints.shift()
    }
    return this.pathWaypoints.length === 0
  }

  private replanPath(goal: Vec2): void {
    this.pathGoal = { x: goal.x, y: goal.y }
    this.pathWaypoints = this.pathfinder.findPathWorld(this.position, goal, this.stats.unitType)

    if (!this.isValidPath(goal)) {
      const bridge = nearestBridgeApproach(this.grid, this.position, goal)
      const leg1 = this.pathfinder.findPathWorld(this.position, bridge, this.stats.unitType)
      const leg2 = this.pathfinder.findPathWorld(bridge, goal, this.stats.unitType)
      this.pathWaypoints = [...leg1, ...leg2]
    }

    this.smoothPath()
  }

  private isValidPath(goal: Vec2): boolean {
    if (this.pathWaypoints.length === 0) return false
    if (!isDirectPathWalkable(this.grid, this.position, this.pathWaypoints[0]!)) return false
    if (this.pathWaypoints.length === 1 && !isDirectPathWalkable(this.grid, this.position, goal)) return false
    return true
  }

  /** Skip redundant waypoints when a straight segment is walkable. */
  private smoothPath(): void {
    if (this.pathWaypoints.length <= 2) return

    const smoothed: Vec2[] = []
    let anchor = this.position

    for (let i = 0; i < this.pathWaypoints.length; i++) {
      const wp = this.pathWaypoints[i]!
      const isLast = i === this.pathWaypoints.length - 1
      const next = this.pathWaypoints[i + 1]

      if (!isLast && next && isDirectPathWalkable(this.grid, anchor, next)) {
        continue
      }

      smoothed.push(wp)
      anchor = wp
    }

    this.pathWaypoints = smoothed
  }

  private clearPath(): void {
    this.pathWaypoints = []
    this.pathGoal = null
  }

  private aggroRangeCells(): number {
    // Ranged troops detect enemies at attack range; melee uses a fixed radius
    return this.stats.attackRange > 2
      ? this.stats.attackRange
      : TROOP_AGGRO_RANGE_CELLS
  }

  private acquireTarget(state: GameState): Entity | null {
    const aggroRange = this.aggroRangePx()
    let best: Entity | null = null
    let bestDist = Infinity

    for (const entity of state.entities.values()) {
      if (entity.owner === this.owner || !entity.isAlive) continue
      if (!this.canAttack(entity)) continue
      const d = this.engageDist(entity)
      if (d <= aggroRange && d < bestDist) {
        bestDist = d
        best = entity
      }
    }

    for (const tower of state.towers.values()) {
      if (tower.owner === this.owner || !tower.isAlive) continue
      const d = this.engageDist(tower)
      if (d <= aggroRange && d < bestDist) {
        bestDist = d
        best = tower
      }
    }

    return best
  }

  private engageDist(entity: Entity): number {
    return Math.sqrt(distSq(this.position, entity.position))
  }

  private hasEnemyBuildingInVision(state: GameState): boolean {
    const range = this.aggroRangePx()
    for (const entity of state.entities.values()) {
      if (entity.owner === this.owner || !entity.isAlive) continue
      if (entity.kind !== EntityKind.BUILDING) continue
      if (surfaceDistToEntity(this.position, entity) <= range) return true
    }
    return false
  }

  /** Nearest enemy building or tower — equal priority by surface distance. */
  private findNearestStructure(state: GameState, maxDist = Infinity): Entity | null {
    let best: Entity | null = null
    let bestDist = Infinity

    for (const entity of state.entities.values()) {
      if (entity.owner === this.owner || !entity.isAlive) continue
      if (entity.kind !== EntityKind.BUILDING || !this.canAttack(entity)) continue
      const d = surfaceDistToEntity(this.position, entity)
      if (d <= maxDist && d < bestDist) {
        bestDist = d
        best = entity
      }
    }

    for (const tower of state.towers.values()) {
      if (tower.owner === this.owner || !tower.isAlive) continue
      const d = surfaceDistToEntity(this.position, tower)
      if (d <= maxDist && d < bestDist) {
        bestDist = d
        best = tower
      }
    }

    return best
  }

  private getMarchObjective(state: GameState): Entity | null {
    return this.findNearestStructure(state)
  }

  private canAttack(entity: Entity): boolean {
    const at = this.stats.attackType
    if (at === 'AIR_AND_GROUND') return true
    const entityType = (entity as Troop).stats?.unitType
    if (!entityType) return true
    if (at === 'AIR_ONLY')    return entityType === UnitType.AIR
    if (at === 'GROUND_ONLY') return entityType === UnitType.GROUND
    return true
  }

  /** Dev overlay — aggro radius in pixels */
  getAggroRangePx(): number {
    return this.aggroRangeCells() * CELL_SIZE
  }

  /** Dev overlay — current path, goal, and target */
  getDevInfo(state: GameState): {
    waypoints: readonly Vec2[]
    goal: Vec2 | null
    targetPos: Vec2 | null
    marchGoal: Vec2 | null
  } {
    return {
      waypoints: [...this.pathWaypoints],
      goal: this.pathGoal ? { ...this.pathGoal } : null,
      targetPos: this.target?.isAlive ? this.moveGoalFor(this.target) : null,
      marchGoal: this.target ? null : this.getMarchObjective(state)?.position ?? null,
    }
  }
}
