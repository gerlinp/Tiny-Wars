import { Entity, nextEntityId } from './Entity'
import { EntityKind, TroopState, UnitType, Owner } from '../types'
import type { EntityStats, Vec2 } from '../types'
import type { GameState } from '../GameState'
import type { Grid } from '../Grid'
import { Pathfinder } from '../Pathfinder'
import {
  approachPointOnSurface,
  edgeDistBetweenEntities,
  meleeApproachPoint,
  pushTroopOutOfEntity,
  surfaceDistToEntity,
} from '../EntityGeometry'
import { distSq, dist } from '../Vector2'
import { findNearestEnemy, findNearestEnemyStructure, isAttackableTower } from '../TargetSelection'
import type { Tower } from './Tower'
import {
  isDirectPathWalkable,
  isOppositeRiverBank,
  isWorldWalkable,
  moveTowardDirect,
  nearestBridgeApproach,
  reachedWorldPoint,
  worldRow,
} from '../Movement'
import { getLaneMarchGoal } from '../LaneMovement'
import { moveTowardWithAllyAvoidance } from '../TroopAvoidance'
import {
  CELL_SIZE, TROOP_AGGRO_RANGE_CELLS, EPSILON_DISTANCE,
  LEFT_LANE_COL, RIGHT_LANE_COL, RIVER_ROW_START, RIVER_ROW_END,
} from '@data/GameConstants'

const PATH_REPLAN_DIST_SQ = CELL_SIZE * CELL_SIZE * 4

/** Ground troop is "stuck" after this long with almost no forward progress while walking. */
const STUCK_RECOVER_MS = 600
/** Fraction of the expected per-tick step that counts as real progress (resets the stuck timer). */
const STUCK_PROGRESS_FRACTION = 0.15
/** A new structure objective must be at least this much closer before a marching troop switches. */
const STRUCTURE_SWITCH_MARGIN = CELL_SIZE * 2

export class Troop extends Entity {
  readonly stats: EntityStats
  state: TroopState = TroopState.WALKING

  private attackCooldownMs = 0

  getAttackCooldownMs(): number {
    return this.attackCooldownMs
  }

  /** Movement speed in grid cells/sec — includes charge boost when active. */
  getEffectiveSpeed(): number {
    if (!this.isCharging) return this.stats.speed
    return this.stats.speed * (this.stats.chargeSpeedMultiplier ?? 1)
  }

  /** True after walking {@link EntityStats.chargeDistanceCells} tiles without attacking. */
  isChargeActive(): boolean {
    return this.isCharging
  }

  private target: Entity | null = null
  readonly grid: Grid
  private readonly pathfinder: Pathfinder
  private pathWaypoints: Vec2[] = []
  private pathGoal: Vec2 | null = null
  private lastObjectiveId: string | null = null
  private lastMarchDir: Vec2
  private walkDistanceCells = 0
  private isCharging = false
  private stuckMs = 0

  constructor(owner: Owner, stats: EntityStats, position: Vec2, grid: Grid, cardId: string) {
    super(nextEntityId(), owner, EntityKind.TROOP, position, stats.maxHp, cardId)
    this.stats = stats
    this.grid = grid
    this.pathfinder = new Pathfinder(grid)
    this.lastMarchDir = owner === Owner.PLAYER ? { x: 0, y: -1 } : { x: 0, y: 1 }
  }

  /** March direction for ally push-from-behind (normalized when moving). */
  getMarchDirection(): Vec2 {
    return this.lastMarchDir
  }

  /** World point the lancer is striking toward — for directional attack anims. */
  getAttackAimPoint(): Vec2 | null {
    if (this.state !== TroopState.ATTACKING || !this.target?.isAlive) return null
    return this.moveGoalFor(this.target)
  }

  tick(deltaMs: number, state: GameState): void {
    if (!this.isAlive) { this.state = TroopState.DEAD; return }

    if (this.attackCooldownMs > 0) this.attackCooldownMs -= deltaMs

    this.refreshCombatTarget(state)

    if (this.target) {
      const attackReach = this.stats.attackRange * CELL_SIZE
      const dist = this.combatDistTo(this.target)
      if (dist <= attackReach) {
        this.state = TroopState.ATTACKING
        this.clearPath()
        this.trackObjective(this.target)
        if (this.attackCooldownMs <= 0) {
          this.performAttack(state, this.target)
          this.attackCooldownMs = 1000 / this.stats.attackRate
        }
        return
      }

      this.state = TroopState.WALKING
      this.trackObjective(this.target)
      this.moveFree(deltaMs, this.moveGoalFor(this.target), state)
      return
    }

    this.state = TroopState.WALKING
    const marchGoal = this.getMarchGoal(state)
    this.trackObjective(null)
    this.moveFree(deltaMs, marchGoal, state)
  }

  private performAttack(state: GameState, primary: Entity): void {
    const damage = this.getAttackDamage()
    const splash = this.stats.splashRadius
    if (splash && splash > 0) {
      this.dealSplashDamage(state, primary.position, primary.id, damage)
      this.resetCharge()
      return
    }
    this.dealDamageTo(state, primary, false, damage)
    this.resetCharge()
  }

  private getAttackDamage(): number {
    if (this.isCharging && this.stats.chargeDamageMultiplier) {
      return Math.round(this.stats.damage * this.stats.chargeDamageMultiplier)
    }
    return this.stats.damage
  }

  private hasChargeAbility(): boolean {
    return (this.stats.chargeDistanceCells ?? 0) > 0
  }

  private recordWalkDistance(cellsMoved: number): void {
    if (!this.hasChargeAbility() || cellsMoved <= 0) return
    this.walkDistanceCells += cellsMoved
    const threshold = this.stats.chargeDistanceCells!
    if (!this.isCharging && this.walkDistanceCells >= threshold) {
      this.isCharging = true
    }
  }

  private resetCharge(): void {
    this.isCharging = false
    this.walkDistanceCells = 0
  }

  private dealDamageTo(state: GameState, target: Entity, splash: boolean, damage = this.stats.damage): void {
    target.takeDamage(damage)
    state.events.push({
      type: 'DAMAGE',
      targetId: target.id,
      amount: damage,
      attackerId: this.id,
      splash,
    })
  }

  private dealSplashDamage(state: GameState, center: Vec2, primaryId: string, damage: number): void {
    const radiusPx = this.stats.splashRadius! * CELL_SIZE

    for (const entity of state.entities.values()) {
      if (entity.owner === this.owner || !entity.isAlive) continue
      if (entity.kind !== EntityKind.TROOP && entity.kind !== EntityKind.BUILDING) continue
      if (!this.canAttack(entity)) continue
      if (dist(center, entity.position) > radiusPx) continue
      this.dealDamageTo(state, entity, entity.id !== primaryId, damage)
    }

    for (const tower of state.towers.values()) {
      if (tower.owner === this.owner || !tower.isAlive) continue
      if (dist(center, tower.position) > radiusPx) continue
      this.dealDamageTo(state, tower, tower.id !== primaryId, damage)
    }
  }

  private trackObjective(entity: Entity | null): void {
    const id = entity?.id ?? null
    if (id !== this.lastObjectiveId) {
      this.lastObjectiveId = id
      this.clearPath()
      this.stuckMs = 0
    }
  }

  private aggroRangePx(): number {
    return this.aggroRangeCells() * CELL_SIZE
  }

  private moveGoalFor(target: Entity): Vec2 {
    if (this.stats.attackRange <= 2) {
      return meleeApproachPoint(this.position, this, target, this.stats.attackRange)
    }
    if (target.kind === EntityKind.BUILDING || target.kind === EntityKind.TOWER) {
      return approachPointOnSurface(this.position, target)
    }
    return target.position
  }

  /** 360° movement — pathfind proactively around the river, always at full speed. */
  private moveFree(deltaMs: number, goal: Vec2, state: GameState): void {
    const dx = goal.x - this.position.x
    const dy = goal.y - this.position.y
    const dirLen = Math.hypot(dx, dy)
    if (dirLen > EPSILON_DISTANCE) {
      this.lastMarchDir = { x: dx / dirLen, y: dy / dirLen }
    }

    const speedMult = this.isCharging ? (this.stats.chargeSpeedMultiplier ?? 1) : 1
    const speed = (this.stats.speed * CELL_SIZE * deltaMs) / 1000 * speedMult
    const beforeX = this.position.x
    const beforeY = this.position.y

    if (this.stats.unitType === UnitType.AIR) {
      moveTowardDirect(this.position, goal, speed)
      this.finishMove(beforeX, beforeY)
      return
    }

    const mustPath = isOppositeRiverBank(this.position, goal) ||
      !isDirectPathWalkable(this.grid, this.position, goal)

    if (mustPath) {
      if (this.needsReplan(goal)) this.replanPath(goal)
      this.moveAlongPath(speed, goal, state)
    } else {
      this.clearPath()
      moveTowardWithAllyAvoidance(this.position, this, goal, speed, state, this.grid)
    }

    this.resolveCollisions(state)
    this.finishMove(beforeX, beforeY)
    this.updateStuckRecovery(deltaMs, speed, goal, beforeX, beforeY)
  }

  /**
   * Safety net for chokepoints (bridges, tower corners): if a walking ground troop makes
   * almost no progress for {@link STUCK_RECOVER_MS}, dislodge it sideways onto walkable
   * ground and force a fresh replan. Guarantees a unit can never permanently stick,
   * whatever the cause (ally deadlock, blocked approach point, collision oscillation).
   */
  private updateStuckRecovery(
    deltaMs: number,
    expectedStep: number,
    goal: Vec2,
    beforeX: number,
    beforeY: number,
  ): void {
    if (expectedStep <= EPSILON_DISTANCE) { this.stuckMs = 0; return }

    const moved = Math.hypot(this.position.x - beforeX, this.position.y - beforeY)
    const remaining = Math.hypot(goal.x - this.position.x, goal.y - this.position.y)
    // Real progress — or simply arriving at the goal — is not "stuck".
    if (moved >= expectedStep * STUCK_PROGRESS_FRACTION || remaining <= expectedStep) {
      this.stuckMs = 0
      return
    }

    this.stuckMs += deltaMs
    if (this.stuckMs < STUCK_RECOVER_MS) return
    this.recoverFromStuck(goal)
    this.stuckMs = 0
  }

  /** Nudge perpendicular to the goal onto walkable ground, then drop the cached path. */
  private recoverFromStuck(goal: Vec2): void {
    const dx = goal.x - this.position.x
    const dy = goal.y - this.position.y
    const len = Math.hypot(dx, dy) || 1
    const px = -dy / len
    const py = dx / len
    const nudge = CELL_SIZE * 0.5

    for (const side of [1, -1] as const) {
      const nx = this.position.x + px * side * nudge
      const ny = this.position.y + py * side * nudge
      if (isWorldWalkable(this.grid, nx, ny)) {
        this.position.x = nx
        this.position.y = ny
        break
      }
    }

    this.clearPath()
  }

  private finishMove(beforeX: number, beforeY: number): void {
    this.recordWalkDistance(
      Math.hypot(this.position.x - beforeX, this.position.y - beforeY) / CELL_SIZE,
    )
  }

  /** Follow path waypoints with ally avoidance on each step segment. */
  private moveAlongPath(speed: number, goal: Vec2, state: GameState): void {
    let budget = speed
    while (budget > EPSILON_DISTANCE) {
      const target = this.pathWaypoints[0] ?? goal
      const dx = target.x - this.position.x
      const dy = target.y - this.position.y
      const d = Math.hypot(dx, dy)
      if (d < EPSILON_DISTANCE) {
        if (this.pathWaypoints.length > 0) this.pathWaypoints.shift()
        if (this.pathWaypoints.length === 0 && reachedWorldPoint(this.position, goal)) break
        continue
      }

      const step = Math.min(budget, d)
      const beforeSegX = this.position.x
      const beforeSegY = this.position.y
      moveTowardWithAllyAvoidance(this.position, this, target, step, state, this.grid)
      budget -= Math.hypot(this.position.x - beforeSegX, this.position.y - beforeSegY)

      if (reachedWorldPoint(this.position, target)) {
        if (this.pathWaypoints.length > 0) this.pathWaypoints.shift()
      } else {
        break
      }
    }
  }

  private resolveCollisions(state: GameState): void {
    const attackReach = this.stats.attackRange * CELL_SIZE
    for (const entity of state.entities.values()) {
      if (!entity.isAlive || entity.kind !== EntityKind.BUILDING) continue
      if (entity.owner === this.owner) continue
      if (
        this.target?.id === entity.id &&
        edgeDistBetweenEntities(this, entity) <= attackReach + CELL_SIZE * 0.25
      ) {
        continue
      }
      pushTroopOutOfEntity(this.position, this, entity)
    }
    for (const tower of state.towers.values()) {
      if (!tower.isAlive || tower.owner === this.owner) continue
      pushTroopOutOfEntity(this.position, this, tower)
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

    // Crossing the river: funnel to the bridge entrance on the unit's own side, cross
    // straight on the lane-centre column, then path to the goal. Built leg-by-leg so the
    // straight crossing is never smoothed into a diagonal that clips the river edge.
    if (isOppositeRiverBank(this.position, goal)) {
      this.pathWaypoints = this.buildBridgeCrossingPath(goal)
      return
    }

    this.pathWaypoints = this.pathfinder.findPathWorld(this.position, goal, this.stats.unitType)

    if (!this.isValidPath(goal)) {
      const bridge = nearestBridgeApproach(this.grid, this.position, goal)
      const leg1 = this.pathfinder.findPathWorld(this.position, bridge, this.stats.unitType)
      const leg2 = this.pathfinder.findPathWorld(bridge, goal, this.stats.unitType)
      this.pathWaypoints = [...leg1, ...leg2]
    }

    this.smoothPath()
  }

  /**
   * CR-style river crossing: pick the bridge on the unit's own side (left half → left
   * bridge, right half → right bridge), route to its front entrance, cross straight on the
   * lane-centre column, then continue to the goal. Each land leg is smoothed independently;
   * the front→exit crossing stays a hard vertical segment so units never diagonally clip the
   * bridge edge.
   */
  private buildBridgeCrossingPath(goal: Vec2): Vec2[] {
    const unitCol = this.grid.worldToCell(this.position.x, this.position.y).x
    const laneCol = Math.abs(unitCol - LEFT_LANE_COL) <= Math.abs(unitCol - RIGHT_LANE_COL)
      ? LEFT_LANE_COL
      : RIGHT_LANE_COL

    const fromBelow = worldRow(this.position.y) > RIVER_ROW_END
    const frontRow = fromBelow ? RIVER_ROW_END + 1 : RIVER_ROW_START - 1
    const exitRow  = fromBelow ? RIVER_ROW_START - 1 : RIVER_ROW_END + 1
    const front = this.grid.cellToWorld(laneCol, frontRow)
    const exit  = this.grid.cellToWorld(laneCol, exitRow)

    const toFront = this.smoothWaypoints(
      this.pathfinder.findPathWorld(this.position, front, this.stats.unitType),
      this.position,
    )
    const afterCross = this.smoothWaypoints(
      this.pathfinder.findPathWorld(exit, goal, this.stats.unitType),
      exit,
    )

    // toFront already ends at `front`; append the explicit straight crossing to `exit`.
    return [...toFront, exit, ...afterCross]
  }

  private isValidPath(goal: Vec2): boolean {
    if (this.pathWaypoints.length === 0) return false
    if (!isDirectPathWalkable(this.grid, this.position, this.pathWaypoints[0]!)) return false
    if (this.pathWaypoints.length === 1 && !isDirectPathWalkable(this.grid, this.position, goal)) return false
    return true
  }

  /** Skip redundant waypoints when a straight segment is walkable. */
  private smoothPath(): void {
    this.pathWaypoints = this.smoothWaypoints(this.pathWaypoints, this.position)
  }

  /** Drop waypoints that a straight walkable segment from `from` can skip. Pure helper. */
  private smoothWaypoints(waypoints: Vec2[], from: Vec2): Vec2[] {
    if (waypoints.length <= 2) return waypoints

    const smoothed: Vec2[] = []
    let anchor = from

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i]!
      const isLast = i === waypoints.length - 1
      const next = waypoints[i + 1]

      if (!isLast && next && isDirectPathWalkable(this.grid, anchor, next)) {
        continue
      }

      smoothed.push(wp)
      anchor = wp
    }

    return smoothed
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

  private engageDistTo(entity: Entity): number {
    if (entity.kind === EntityKind.BUILDING || entity.kind === EntityKind.TOWER) {
      return surfaceDistToEntity(this.position, entity)
    }
    return Math.sqrt(distSq(this.position, entity.position))
  }

  /**
   * Closest enemy in aggro range while marching; once in attack range, stick until it dies.
   * Giant-style troops only consider buildings and towers.
   */
  private refreshCombatTarget(state: GameState): void {
    const attackReach = this.stats.attackRange * CELL_SIZE
    const engagedTarget = this.target?.isAlive ? this.target : null
    const engagedOnTroop = engagedTarget?.kind === EntityKind.TROOP
    const engaged =
      engagedTarget !== null &&
      this.combatDistTo(engagedTarget) <= attackReach &&
      !(this.stats.targetsBuildingsOnly && engagedOnTroop)
    if (engaged) return

    if (this.stats.targetsBuildingsOnly) {
      this.target = this.stickyStructureTarget(findNearestEnemyStructure(state, {
        owner: this.owner,
        from: this.position,
        canAttack: (entity) => this.canAttack(entity),
        distance: (_from, entity) => this.engageDistTo(entity),
      }))
      return
    }

    const troopTarget = findNearestEnemy(state, {
      owner: this.owner,
      from: this.position,
      includeTowers: false,
      canAttack: (entity) => this.canAttack(entity),
      distance: (_from, entity) => this.engageDistTo(entity),
      maxDistance: this.aggroRangePx(),
    })

    const structureTarget = findNearestEnemyStructure(state, {
      owner: this.owner,
      from: this.position,
      canAttack: (entity) => this.canAttack(entity),
      distance: (_from, entity) => this.engageDistTo(entity),
    })

    this.target = troopTarget ?? this.stickyStructureTarget(structureTarget)
  }

  /**
   * Hysteresis for the marching objective: keep the current structure unless it died/became
   * invalid, or a candidate is clearly closer ({@link STRUCTURE_SWITCH_MARGIN}). Without this,
   * a troop near-equidistant between two towers flip-flops its target every tick, which clears
   * the cached path repeatedly and stalls it at the bridge.
   */
  private stickyStructureTarget(candidate: Entity | null): Entity | null {
    const current = this.target
    if (!candidate) return current?.isAlive ? current : null

    const currentIsStructure =
      !!current?.isAlive &&
      ((current.kind === EntityKind.TOWER && isAttackableTower(current as Tower)) ||
        current.kind === EntityKind.BUILDING)
    if (!currentIsStructure) return candidate
    if (current!.id === candidate.id) return current!

    const curDist = this.engageDistTo(current!)
    const candDist = this.engageDistTo(candidate)
    return candDist < curDist - STRUCTURE_SWITCH_MARGIN ? candidate : current!
  }

  /** March toward nearest enemy structure, or lane-biased fallback when none exist. */
  private getMarchGoal(state: GameState): Vec2 {
    const objective = findNearestEnemyStructure(state, {
      owner: this.owner,
      from: this.position,
      canAttack: (entity) => this.canAttack(entity),
      distance: (_from, entity) => this.engageDistTo(entity),
    })
    if (objective) return this.moveGoalFor(objective)
    return this.getLaneMarchGoal()
  }

  /** Lane-biased march when no enemy structures remain — goal is far ahead for smooth movement. */
  private getLaneMarchGoal(): Vec2 {
    return getLaneMarchGoal(
      this.position.x,
      this.position.y,
      this.owner,
      (wx, wy) => this.grid.worldToCell(wx, wy),
      (col, row) => this.grid.cellToWorld(col, row),
    )
  }

  /** Melee uses edge-to-edge gap; ranged uses center-to-center. */
  private combatDistTo(entity: Entity): number {
    if (this.stats.attackRange > 2) {
      return Math.sqrt(distSq(this.position, entity.position))
    }
    return edgeDistBetweenEntities(this, entity)
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
  getDevInfo(_state: GameState): {
    waypoints: readonly Vec2[]
    goal: Vec2 | null
    targetPos: Vec2 | null
    marchGoal: Vec2 | null
  } {
    return {
      waypoints: [...this.pathWaypoints],
      goal: this.pathGoal ? { ...this.pathGoal } : null,
      targetPos: this.target?.isAlive ? this.moveGoalFor(this.target) : null,
      marchGoal: this.target ? null : this.getMarchGoal(_state),
    }
  }
}
