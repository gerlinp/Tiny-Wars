import { Entity, nextEntityId } from './Entity'
import { EntityKind, TroopState, UnitType, Owner } from '../types'
import type { EntityStats, Vec2 } from '../types'
import type { GameState } from '../GameState'
import type { Grid } from '../Grid'
import { Pathfinder } from '../Pathfinder'
import {

  edgeDistBetweenEntities,
  meleeApproachPoint,
  pushTroopOutOfEntity,
  surfaceDistToEntity,
} from '../EntityGeometry'
import { dealAreaDamage, applySlowInRadius, applyHealInRadius } from '../AreaDamage'
import { launchBoomerang, isBoomerangThrowerBusy } from '../BoomerangSystem'
import { canHookTarget, isHookThrowerBusy, launchHook } from '../HookSystem'
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
import { troopDeployPositions } from '../DeploySystem'
import { CARD_DEFINITIONS } from '@data/CardData'
import {
  CELL_SIZE, TROOP_AGGRO_RANGE_CELLS, COMBAT_LEASH_MULTIPLIER, EPSILON_DISTANCE,
  LEFT_LANE_COL, RIGHT_LANE_COL, RIVER_ROW_START, RIVER_ROW_END,
  HEAL_PULSE_INTERVAL_MS, THIEF_DASH_WINDUP_MS, HOOK_WINDUP_MS,
  TROOP_DEPLOY_SPREAD_CELLS, BRIDGE_CENTER_COL,
} from '@data/GameConstants'

interface ActiveHealBurst {
  radiusCells: number
  healPerPulse: number
  pulsesRemaining: number
  nextPulseMs: number
}

const PATH_REPLAN_DIST_SQ = CELL_SIZE * CELL_SIZE * 4

export type DashPhase = 'windup' | 'leap'

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

  /** Movement speed in grid cells/sec — includes charge boost, dash leap, and slow debuffs. */
  getEffectiveSpeed(): number {
    let speed = this.buildingChargeRunActive && this.stats.buildingChargeSpeed != null
      ? this.stats.buildingChargeSpeed
      : this.stats.speed
    if (this.isCharging) speed *= this.stats.chargeSpeedMultiplier ?? 1
    if (this.isDashing && this.dashWindupMsRemaining <= 0) {
      speed *= this.stats.dashSpeedMultiplier ?? 1
    }
    speed *= this.slowSpeedMultiplier
    return speed
  }

  /** True after walking {@link EntityStats.chargeDistanceCells} tiles without attacking. */
  isChargeActive(): boolean {
    return this.isCharging
  }

  /** True while winding up or leaping on a Bandit-style dash. */
  isDashActive(): boolean {
    return this.isDashing
  }

  /** True while charging a fisherman-style hook throw. */
  isHookWindupActive(): boolean {
    return this.isHooking
  }

  /** Fisherman-style hook phase — `windup` while charging the throw. */
  getHookPhase(): 'windup' | null {
    if (!this.isHooking) return null
    return 'windup'
  }

  /** True when a hook is flying or pulling for this unit. */
  isHookBusy(state: GameState): boolean {
    return isHookThrowerBusy(state, this.id)
  }

  /** Gnoll-style thrower — hold position while attacking or until the bone returns. */
  isBoomerangAnchored(state: GameState): boolean {
    if (!this.stats.boomerangAttack) return false
    if (isBoomerangThrowerBusy(state, this.id)) return true
    return this.state === TroopState.ATTACKING
  }

  /** Snap back after collision resolution so the thrower stays planted. */
  restoreBoomerangAnchor(): void {
    if (!this.boomerangAnchorPos) return
    this.position.x = this.boomerangAnchorPos.x
    this.position.y = this.boomerangAnchorPos.y
  }

  /** Current opening-dash phase — `windup` (idle hold) or `leap` (frozen run pose). */
  getDashPhase(): DashPhase | null {
    if (!this.isDashing) return null
    return this.dashWindupMsRemaining > 0 ? 'windup' : 'leap'
  }

  private target: Entity | null = null
  readonly grid: Grid
  private readonly pathfinder: Pathfinder
  private pathWaypoints: Vec2[] = []
  private pathGoal: Vec2 | null = null
  private lastObjectiveId: string | null = null
  /** Tower ID the unit is currently marching toward — used to sample the right flow field. */
  private marchTowerId: string | null = null
  private readonly spawnLane: 'left' | 'right'
  private lastMarchDir: Vec2
  private walkDistanceCells = 0
  private isCharging = false
  private stuckMs = 0
  private slowSpeedMultiplier = 1
  private slowUntilMs = 0
  private isDashing = false
  private dashWindupMsRemaining = 0
  private dashTarget: Vec2 | null = null
  private dashTargetEntity: Entity | null = null
  private isHooking = false
  private hookWindupMsRemaining = 0
  private hookTargetEntity: Entity | null = null
  private activeHealBurst: ActiveHealBurst | null = null
  private armorHp = 0
  private boomerangAnchorPos: Vec2 | null = null
  private spawnMinionCooldownMs: number | null = null
  /** Goblin Demolisher — HP clamped at charge threshold until the suicide run starts. */
  private buildingChargeArmed = false
  private buildingChargeRunActive = false

  constructor(owner: Owner, stats: EntityStats, position: Vec2, grid: Grid, cardId: string) {
    super(nextEntityId(), owner, EntityKind.TROOP, position, stats.maxHp, cardId)
    this.stats = stats
    this.armorHp = stats.armorHp ?? 0
    this.grid = grid
    this.pathfinder = new Pathfinder(grid)
    this.lastMarchDir = owner === Owner.PLAYER ? { x: 0, y: -1 } : { x: 0, y: 1 }
    this.spawnLane = position.x < BRIDGE_CENTER_COL * CELL_SIZE ? 'left' : 'right'
    if (stats.spawnMinionCardId) {
      this.spawnMinionCooldownMs = stats.spawnMinionInitialDelayMs ?? 1000
    }
  }

  /** HP fraction for UI — includes armor pool when present. */
  getHpFraction(): number {
    const bodyMax = this.maxHp
    const armorMax = this.stats.armorHp ?? 0
    if (armorMax <= 0) return this.hp / bodyMax
    const total = this.hp + this.armorHp
    const totalMax = bodyMax + armorMax
    return totalMax > 0 ? total / totalMax : 0
  }

  override takeDamage(amount: number): void {
    if (amount <= 0) return

    const floor = this.buildingChargeHpThreshold()
    if (floor !== null && this.hp < floor) {
      this.buildingChargeArmed = true
      this.buildingChargeRunActive = true
    }

    if (floor !== null && this.buildingChargeArmed && !this.buildingChargeRunActive) {
      return
    }

    this.hasBeenDamaged = true
    let remaining = amount
    if (this.armorHp > 0) {
      const absorbed = Math.min(this.armorHp, remaining)
      this.armorHp -= absorbed
      remaining -= absorbed
    }
    if (remaining > 0) {
      if (floor !== null && !this.buildingChargeRunActive && this.hp > floor) {
        const newHp = this.hp - remaining
        if (newHp <= floor) {
          this.hp = floor
          this.buildingChargeArmed = true
          return
        }
      }
      this.hp = Math.max(0, this.hp - remaining)
    }
  }

  /** March direction for ally push-from-behind (normalized when moving). */
  getMarchDirection(): Vec2 {
    return this.lastMarchDir
  }

  /** True while deploy or attack heal pulses are still ticking. */
  isHealBurstActive(): boolean {
    return this.activeHealBurst !== null
  }

  /** Deploy-time heal aura (e.g. Monk spawn heal). */
  applySpawnHeal(state: GameState): void {
    const s = this.stats
    if (!s.spawnHealRadius || !s.spawnHealPerPulse) return
    this.startHealBurst(state, s.spawnHealRadius, s.spawnHealPerPulse, s.spawnHealPulseCount ?? 4)
  }

  /** World point the unit is striking toward — for directional attack anims and dash facing. */
  getAttackAimPoint(): Vec2 | null {
    const aimTarget = this.isDashing
      ? this.dashTargetEntity
      : this.isHooking
        ? this.hookTargetEntity
        : (this.state === TroopState.ATTACKING ? this.target : null)
    if (!aimTarget?.isAlive) return null
    return this.moveGoalFor(aimTarget)
  }

  /** Aim vector while Prince-style charge is active — for the lunge attack clip. */
  getChargeAimPoint(): Vec2 | null {
    if (!this.isCharging) return null
    if (this.target?.isAlive) return this.moveGoalFor(this.target)
    const dir = this.lastMarchDir
    return {
      x: this.position.x + dir.x * CELL_SIZE * 4,
      y: this.position.y + dir.y * CELL_SIZE * 4,
    }
  }

  tick(deltaMs: number, state: GameState): void {
    this.runTick(deltaMs, state)
    this.syncBoomerangAnchor(state)
  }

  private wasInBuildingChargeMode = false

  private runTick(deltaMs: number, state: GameState): void {
    if (!this.isAlive) { this.state = TroopState.DEAD; return }

    this.tickHealPulses(deltaMs, state)
    this.tickMinionSpawns(deltaMs, state)
    this.tickSlow(deltaMs)

    if (this.attackCooldownMs > 0) this.attackCooldownMs -= deltaMs

    this.syncBuildingChargeState()
    this.syncBuildingChargeTransition()
    this.refreshCombatTarget(state)

    if (this.target) {
      const attackReach = this.effectiveAttackRange() * CELL_SIZE
      const dist = this.combatDistTo(this.target)

      if (this.isDashing) {
        if (!this.target.isAlive || this.dashTargetEntity?.id !== this.target.id) {
          this.cancelDash()
        } else {
          this.tickOpeningDash(deltaMs, state, this.target)
          return
        }
      }

      if (this.isHooking) {
        if (!this.target.isAlive || this.hookTargetEntity?.id !== this.target.id) {
          this.cancelHook()
        } else {
          this.tickHookWindup(deltaMs, state, this.target)
          return
        }
      }

      if (isHookThrowerBusy(state, this.id)) {
        this.state = TroopState.ATTACKING
        this.clearPath()
        this.trackObjective(this.target)
        return
      }

      if (this.stats.boomerangAttack && isBoomerangThrowerBusy(state, this.id)) {
        this.state = TroopState.ATTACKING
        this.clearPath()
        this.trackObjective(this.target)
        return
      }

      if (dist <= attackReach) {
        this.state = TroopState.ATTACKING
        this.clearPath()
        this.trackObjective(this.target)
        if (
          this.isBuildingChargeMode()
          && (this.target.kind === EntityKind.BUILDING || this.target.kind === EntityKind.TOWER)
        ) {
          this.detonateOnStructure(state)
          return
        }
        if (this.attackCooldownMs <= 0) {
          this.performAttack(state, this.target)
          this.attackCooldownMs = 1000 / this.stats.attackRate
        }
        return
      }

      if (this.canStartOpeningDash(dist)) {
        this.startOpeningDash(this.target)
        this.tickOpeningDash(deltaMs, state, this.target)
        return
      }

      if (this.canStartHook(dist) && canHookTarget(this.target)) {
        this.startHook(this.target)
        this.tickHookWindup(deltaMs, state, this.target)
        return
      }

      this.state = TroopState.WALKING
      this.trackObjective(this.target)
      this.marchTowerId = this.target.kind === EntityKind.TOWER ? this.target.id : null
      this.moveFree(deltaMs, this.moveGoalFor(this.target), state)
      return
    }

    this.state = TroopState.WALKING
    const marchGoal = this.getMarchGoal(state)  // also sets this.marchTowerId
    this.trackObjective(null)
    this.moveFree(deltaMs, marchGoal, state)
  }

  private syncBoomerangAnchor(state: GameState): void {
    if (this.isBoomerangAnchored(state)) {
      if (!this.boomerangAnchorPos) {
        this.boomerangAnchorPos = { x: this.position.x, y: this.position.y }
      }
      return
    }
    this.boomerangAnchorPos = null
  }

  private performAttack(state: GameState, primary: Entity): void {
    const damage = this.getAttackDamage()
    if (this.stats.boomerangAttack) {
      const travelCells = this.stats.boomerangTravelCells ?? 7.5
      launchBoomerang(state, this, primary, travelCells, damage)
      this.resetCharge()
      return
    }
    const splash = this.stats.splashRadius
    if (splash && splash > 0) {
      this.dealSplashDamage(state, primary.position, primary.id, damage)
    } else {
      this.dealDamageTo(state, primary, false, damage)
    }
    this.resetCharge()
    this.applyActiveHeal(state)
  }

  /** CR Goblin Demolisher — kamikaze at or below this HP fraction (e.g. 0.5 = half health). */
  inBuildingChargeMode(): boolean {
    if (this.buildingChargeArmed) return true
    const floor = this.buildingChargeHpThreshold()
    if (floor === null || this.maxHp <= 0) return false
    return this.hp <= floor
  }

  /** True once the suicide run has started (movement toward a building). */
  isBuildingChargeRunActive(): boolean {
    return this.buildingChargeRunActive
  }

  private buildingChargeHpThreshold(): number | null {
    const threshold = this.stats.buildingChargeHpFraction
    if (threshold === undefined || this.maxHp <= 0) return null
    return Math.floor(this.maxHp * threshold)
  }

  private isBuildingChargeMode(): boolean {
    return this.inBuildingChargeMode()
  }

  private syncBuildingChargeState(): void {
    const floor = this.buildingChargeHpThreshold()
    if (floor === null) return
    if (this.hp < floor) {
      this.buildingChargeArmed = true
      this.buildingChargeRunActive = true
    } else if (this.hp <= floor) {
      this.buildingChargeArmed = true
    }
  }

  /** CR — stop throwing and rush buildings the tick HP crosses the charge threshold. */
  private syncBuildingChargeTransition(): void {
    const inCharge = this.isBuildingChargeMode()
    if (inCharge && !this.wasInBuildingChargeMode) {
      if (this.target?.kind === EntityKind.TROOP) this.target = null
      this.clearPath()
      this.attackCooldownMs = 0
    }
    this.wasInBuildingChargeMode = inCharge
  }

  private effectiveAttackRange(): number {
    if (this.isBuildingChargeMode() && this.stats.buildingChargeAttackRange != null) {
      return this.stats.buildingChargeAttackRange
    }
    return this.stats.attackRange
  }

  private effectiveTargetsBuildingsOnly(): boolean {
    return this.isBuildingChargeMode() || this.stats.targetsBuildingsOnly === true
  }

  private applyActiveHeal(state: GameState): void {
    const s = this.stats
    if (!s.healRadius || !s.healPerPulse) return
    this.startHealBurst(state, s.healRadius, s.healPerPulse, s.healPulseCount ?? 4)
  }

  /** CR-style heal burst — each pulse heals every injured ally in radius. */
  private startHealBurst(
    state: GameState,
    radiusCells: number,
    healPerPulse: number,
    pulseCount: number,
  ): void {
    if (pulseCount <= 0) return
    this.activeHealBurst = {
      radiusCells,
      healPerPulse,
      pulsesRemaining: pulseCount,
      nextPulseMs: 0,
    }
    this.fireHealPulse(state)
  }

  private tickHealPulses(deltaMs: number, state: GameState): void {
    const burst = this.activeHealBurst
    if (!burst) return

    burst.nextPulseMs -= deltaMs
    if (burst.nextPulseMs > 0) return

    this.fireHealPulse(state)
  }

  private fireHealPulse(state: GameState): void {
    const burst = this.activeHealBurst
    if (!burst || burst.pulsesRemaining <= 0) return

    applyHealInRadius(
      state,
      this.owner,
      this.position,
      burst.radiusCells,
      burst.healPerPulse,
      this.id,
    )

    state.events.push({
      type: 'HEAL_AURA',
      position: { x: this.position.x, y: this.position.y },
      radius: burst.radiusCells,
      owner: this.owner,
      healerId: this.id,
    })

    burst.pulsesRemaining--
    if (burst.pulsesRemaining <= 0) {
      this.activeHealBurst = null
    } else {
      burst.nextPulseMs = HEAL_PULSE_INTERVAL_MS
    }
  }

  private tickMinionSpawns(deltaMs: number, state: GameState): void {
    if (this.spawnMinionCooldownMs === null) return

    this.spawnMinionCooldownMs -= deltaMs
    if (this.spawnMinionCooldownMs > 0) return

    this.spawnMinions(state)
    this.spawnMinionCooldownMs = this.stats.spawnMinionIntervalMs ?? 7000
  }

  private spawnMinions(state: GameState): void {
    const cardId = this.stats.spawnMinionCardId
    if (!cardId) return

    const spawnDef = CARD_DEFINITIONS[cardId]
    if (!spawnDef?.stats) return

    const count = this.stats.spawnMinionCount ?? spawnDef.deployCount ?? 1
    const positions = troopDeployPositions(this.position, count, TROOP_DEPLOY_SPREAD_CELLS)
    for (const pos of positions) {
      const minion = new Troop(this.owner, spawnDef.stats, pos, this.grid, spawnDef.id)
      state.entities.set(minion.id, minion)
      state.events.push({ type: 'DEPLOY', entityId: minion.id, cardId: spawnDef.id, position: pos })
    }
  }

  private deathExplosionTriggered = false

  /** Death nova — area damage and optional slow (e.g. Turtle). */
  applyDeathNova(state: GameState): void {
    if (this.deathExplosionTriggered) return
    const radius = this.stats.deathSplashRadius
    if (!radius) return
    this.deathExplosionTriggered = true

    const damage = this.stats.deathSplashDamage ?? this.stats.damage
    dealAreaDamage(state, this.owner, this.position, radius, damage, () => true, this.id)

    if (this.stats.deathSlowDurationMs && this.stats.deathSlowSpeedMultiplier !== undefined) {
      applySlowInRadius(
        state,
        this.owner,
        this.position,
        radius,
        this.stats.deathSlowDurationMs,
        this.stats.deathSlowSpeedMultiplier,
      )
    }
  }

  /** Wall-breaker style detonation on reaching a structure in charge mode. */
  private detonateOnStructure(state: GameState): void {
    this.applyDeathNova(state)
    this.hp = 0
  }

  applySlow(durationMs: number, speedMultiplier: number): void {
    this.slowUntilMs = Math.max(this.slowUntilMs, durationMs)
    this.slowSpeedMultiplier = Math.min(this.slowSpeedMultiplier, speedMultiplier)
  }

  private tickSlow(deltaMs: number): void {
    if (this.slowUntilMs <= 0) return
    this.slowUntilMs -= deltaMs
    if (this.slowUntilMs <= 0) {
      this.slowUntilMs = 0
      this.slowSpeedMultiplier = 1
    }
  }

  private getAttackDamage(): number {
    let damage = this.stats.damage
    if (this.isCharging && this.stats.chargeDamageMultiplier) {
      damage = Math.round(damage * this.stats.chargeDamageMultiplier)
    }
    return damage
  }

  private hasOpeningDash(): boolean {
    return (this.stats.dashRangeCells ?? 0) > 0
  }

  private canStartOpeningDash(distPx: number): boolean {
    if (!this.hasOpeningDash() || this.attackCooldownMs > 0) return false
    const dashReachPx = this.stats.dashRangeCells! * CELL_SIZE
    return distPx <= dashReachPx && distPx > this.stats.attackRange * CELL_SIZE
  }

  private startOpeningDash(target: Entity): void {
    this.isDashing = true
    this.dashWindupMsRemaining = this.stats.dashWindupMs ?? THIEF_DASH_WINDUP_MS
    this.dashTargetEntity = target
    this.dashTarget = this.moveGoalFor(target)
    this.clearPath()
    this.trackObjective(target)
    this.state = TroopState.WALKING
  }

  private cancelDash(): void {
    this.isDashing = false
    this.dashWindupMsRemaining = 0
    this.dashTarget = null
    this.dashTargetEntity = null
  }

  private hasHookAttack(): boolean {
    return this.stats.hookAttack === true
  }

  private canStartHook(distPx: number): boolean {
    if (!this.hasHookAttack() || this.attackCooldownMs > 0) return false
    const minPx = (this.stats.hookMinRangeCells ?? 3.5) * CELL_SIZE
    const maxPx = (this.stats.hookMaxRangeCells ?? 7) * CELL_SIZE
    return distPx >= minPx && distPx <= maxPx
  }

  private startHook(target: Entity): void {
    this.isHooking = true
    this.hookWindupMsRemaining = this.stats.hookWindupMs ?? HOOK_WINDUP_MS
    this.hookTargetEntity = target
    this.clearPath()
    this.trackObjective(target)
    this.state = TroopState.ATTACKING
  }

  private cancelHook(): void {
    this.isHooking = false
    this.hookWindupMsRemaining = 0
    this.hookTargetEntity = null
  }

  private tickHookWindup(deltaMs: number, state: GameState, target: Entity): void {
    this.state = TroopState.ATTACKING
    if (this.hookWindupMsRemaining > 0) {
      this.hookWindupMsRemaining -= deltaMs
      return
    }

    this.cancelHook()
    launchHook(
      state,
      this,
      target,
      this.stats.hookSlowDurationMs ?? 1500,
      this.stats.hookSlowSpeedMultiplier ?? 0.65,
    )
    this.attackCooldownMs = 1000 / this.stats.attackRate
  }

  private tickOpeningDash(deltaMs: number, state: GameState, target: Entity): void {
    if (this.dashWindupMsRemaining > 0) {
      this.dashWindupMsRemaining -= deltaMs
      this.state = TroopState.WALKING
      return
    }

    const goal = this.dashTarget ?? this.moveGoalFor(target)
    this.dashTarget = goal
    const step = this.getEffectiveSpeed() * CELL_SIZE * deltaMs / 1000
    moveTowardDirect(this.position, goal, step)
    this.state = TroopState.WALKING
    if (reachedWorldPoint(this.position, goal, step)) {
      this.cancelDash()
      this.state = TroopState.ATTACKING
      this.performAttack(state, target)
      this.attackCooldownMs = 1000 / this.stats.attackRate
    }
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
    const range = this.effectiveAttackRange()
    if (target.kind === EntityKind.BUILDING || target.kind === EntityKind.TOWER) {
      // Always use meleeApproachPoint for structures — it stops the unit at attack range
      // from the surface (not at the surface itself), so ranged units fire from distance.
      return meleeApproachPoint(this.position, this, target, range)
    }
    if (range <= 2) {
      return meleeApproachPoint(this.position, this, target, range)
    }
    return target.position
  }

  /** 360° movement — flow field navigation for towers; A* fallback for other targets. */
  private moveFree(deltaMs: number, goal: Vec2, state: GameState): void {
    const dx = goal.x - this.position.x
    const dy = goal.y - this.position.y
    const dirLen = Math.hypot(dx, dy)
    if (dirLen > EPSILON_DISTANCE) {
      this.lastMarchDir = { x: dx / dirLen, y: dy / dirLen }
    }

    const speed = (this.getEffectiveSpeed() * CELL_SIZE * deltaMs) / 1000
    const beforeX = this.position.x
    const beforeY = this.position.y

    if (
      this.target?.isAlive
      && this.isBuildingChargeMode()
      && (this.target.kind === EntityKind.BUILDING || this.target.kind === EntityKind.TOWER)
      && edgeDistBetweenEntities(this, this.target) <= CELL_SIZE * 2.5
    ) {
      this.clearPath()
      const chargeGoal = meleeApproachPoint(
        this.position,
        this,
        this.target,
        this.effectiveAttackRange(),
      )
      moveTowardDirect(this.position, chargeGoal, speed)
      this.resolveCollisions(state)
      this.finishMove(beforeX, beforeY)
      this.updateStuckRecovery(deltaMs, speed, chargeGoal, beforeX, beforeY)
      return
    }

    if (this.stats.unitType === UnitType.AIR) {
      moveTowardDirect(this.position, goal, speed)
      this.finishMove(beforeX, beforeY)
      return
    }

    const directOk = !isOppositeRiverBank(this.position, goal) &&
      isDirectPathWalkable(this.grid, this.position, goal)

    if (directOk) {
      // Straight shot — no need for any pathfinding.
      this.clearPath()
      moveTowardWithAllyAvoidance(this.position, this, goal, speed, state, this.grid)
    } else if (this.marchTowerId && state.flowFields && this.effectiveAttackRange() > 2) {
      // Flow field — ranged / lane march only; melee uses direct approach to standoff point.
      const dir = state.flowFields.directionTo(this.marchTowerId, this.position.x, this.position.y)
      if (dir) {
        this.clearPath()
        // Step toward the centre of the next cell in the flow direction.
        const curCol = Math.floor(this.position.x / CELL_SIZE)
        const curRow = Math.floor(this.position.y / CELL_SIZE)
        const nextWorld = {
          x: (curCol + Math.round(dir.x) + 0.5) * CELL_SIZE,
          y: (curRow + Math.round(dir.y) + 0.5) * CELL_SIZE,
        }
        moveTowardWithAllyAvoidance(this.position, this, nextWorld, speed, state, this.grid)
      } else {
        // At goal cell or unreachable — fall back to A*.
        if (this.needsReplan(goal)) this.replanPath(goal)
        this.moveAlongPath(speed, goal, state)
      }
    } else {
      // A* for non-tower targets (enemy troops, buildings) or when flow fields unavailable.
      if (this.needsReplan(goal)) this.replanPath(goal)
      this.moveAlongPath(speed, goal, state)
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
    const moved = Math.hypot(this.position.x - beforeX, this.position.y - beforeY) > EPSILON_DISTANCE
    if (
      moved
      && this.buildingChargeArmed
      && !this.buildingChargeRunActive
      && this.state === TroopState.WALKING
    ) {
      this.buildingChargeRunActive = true
    }
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
      const curRow = (this.position.y / CELL_SIZE) | 0
      const inBridgeRows = curRow >= RIVER_ROW_START && curRow <= RIVER_ROW_END
      if (inBridgeRows) {
        moveTowardDirect(this.position, target, step)
      } else {
        moveTowardWithAllyAvoidance(this.position, this, target, step, state, this.grid)
      }
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
      // Chase movement uses meleeApproachPoint — don't fight separation while closing in.
      if (this.target?.id === tower.id) continue
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
    const range = this.effectiveAttackRange()
    return range > 2 ? range : TROOP_AGGRO_RANGE_CELLS
  }

  private engageDistTo(entity: Entity, state?: GameState): number {
    if (entity.kind === EntityKind.TOWER && state?.flowFields) {
      const cost = state.flowFields.costTo(entity.id, this.position.x, this.position.y)
      // Flow field costs are 10-scaled (cardinal=10, diagonal=14); divide by 10 to normalize
      // back to approximate hop count before converting to pixel distance.
      if (cost < Infinity) return (cost / 10) * CELL_SIZE
    }
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
    const attackReach = this.effectiveAttackRange() * CELL_SIZE
    const engagedTarget = this.target?.isAlive ? this.target : null
    const engagedOnTroop = engagedTarget?.kind === EntityKind.TROOP

    // Structures: keep target while within leash range.
    if (
      engagedTarget !== null &&
      !engagedOnTroop &&
      this.combatDistTo(engagedTarget) <= attackReach * COMBAT_LEASH_MULTIPLIER &&
      !this.effectiveTargetsBuildingsOnly()
    ) return

    // Troops: keep chasing as long as they're alive and nothing closer has appeared.
    if (engagedOnTroop && !this.effectiveTargetsBuildingsOnly()) {
      const nearestTroop = findNearestEnemy(state, {
        owner: this.owner,
        from: this.position,
        includeTowers: false,
        canAttack: (entity) => this.canAttack(entity),
        distance: (_from, entity) => this.engageDistTo(entity, state),
        maxDistance: this.aggroRangePx(),
      })
      // Keep current troop unless a different one is meaningfully closer.
      const currentDist = this.engageDistTo(engagedTarget!, state)
      const nearestDist = nearestTroop ? this.engageDistTo(nearestTroop, state) : Infinity
      if (!nearestTroop || nearestTroop.id === engagedTarget!.id || nearestDist >= currentDist - CELL_SIZE * 2) {
        return
      }
      this.target = nearestTroop
      return
    }

    // This unit's tower target just died — redirect using lane-aware selection so we
    // hit the same-side princess next (if alive) or the king, not the cross-side tower.
    if (this.target?.kind === EntityKind.TOWER && !this.target.isAlive && state.flowFields) {
      const next = state.flowFields.nearestEnemyTower(state, this.position, this.owner, this.spawnLane)
      if (next) {
        this.target = next
        return
      }
    }

    if (this.effectiveTargetsBuildingsOnly()) {
      if (this.target?.kind === EntityKind.TROOP) this.target = null
      this.target = this.stickyStructureTarget(findNearestEnemyStructure(state, {
        owner: this.owner,
        from: this.position,
        canAttack: (entity) => this.canAttack(entity),
        distance: (_from, entity) => this.engageDistTo(entity, state),
      }), state)
      return
    }

    const troopTarget = findNearestEnemy(state, {
      owner: this.owner,
      from: this.position,
      includeTowers: false,
      canAttack: (entity) => this.canAttack(entity),
      distance: (_from, entity) => this.engageDistTo(entity, state),
      maxDistance: this.aggroRangePx(),
    })

    // Use lane-aware tower selection so units march to their assigned side's princess
    // (not the globally cheapest tower). Fall back to findNearestEnemyStructure only
    // if no tower is reachable (e.g., targets a placed building in the way).
    const laneAwareTower = state.flowFields
      ? state.flowFields.nearestEnemyTower(state, this.position, this.owner, this.spawnLane)
      : null
    const structureTarget = laneAwareTower ?? findNearestEnemyStructure(state, {
      owner: this.owner,
      from: this.position,
      canAttack: (entity) => this.canAttack(entity),
      distance: (_from, entity) => this.engageDistTo(entity, state),
    })

    this.target = troopTarget ?? this.stickyStructureTarget(structureTarget, state)
  }

  /**
   * Hysteresis for the marching objective: keep the current structure unless it died/became
   * invalid, or a candidate is clearly closer ({@link STRUCTURE_SWITCH_MARGIN}). Without this,
   * a troop near-equidistant between two towers flip-flops its target every tick, which clears
   * the cached path repeatedly and stalls it at the bridge.
   */
  private stickyStructureTarget(candidate: Entity | null, state?: GameState): Entity | null {
    const current = this.target
    if (!candidate) return current?.isAlive ? current : null

    const currentIsStructure =
      !!current?.isAlive &&
      ((current.kind === EntityKind.TOWER && isAttackableTower(current as Tower)) ||
        current.kind === EntityKind.BUILDING)
    if (!currentIsStructure) return candidate
    if (current!.id === candidate.id) return current!

    const curDist = this.engageDistTo(current!, state)
    const candDist = this.engageDistTo(candidate, state)
    return candDist < curDist - STRUCTURE_SWITCH_MARGIN ? candidate : current!
  }

  /** March toward nearest enemy structure by path distance, or lane fallback when none exist. */
  private getMarchGoal(state: GameState): Vec2 {
    // Prefer flow field: lane-aware selection keeps units on their spawn side.
    if (state.flowFields) {
      const tower = state.flowFields.nearestEnemyTower(state, this.position, this.owner, this.spawnLane)
      if (tower) {
        this.marchTowerId = tower.id
        return this.moveGoalFor(tower)
      }
    }

    // Fallback (no flow fields, or all towers gone): Euclidean distance selection.
    const objective = findNearestEnemyStructure(state, {
      owner: this.owner,
      from: this.position,
      canAttack: (entity) => this.canAttack(entity),
      distance: (_from, entity) => this.engageDistTo(entity, state),
    })
    if (objective) {
      this.marchTowerId = objective.kind === EntityKind.TOWER ? objective.id : null
      return this.moveGoalFor(objective)
    }

    this.marchTowerId = null
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

  /** Melee uses edge-to-edge gap; ranged uses center-to-center. Building-charge uses edge gap on structures. */
  private combatDistTo(entity: Entity): number {
    if (entity.kind === EntityKind.BUILDING || entity.kind === EntityKind.TOWER) {
      // Structures: always surface-to-surface so attackRange means "cells from tower edge".
      // This matches meleeApproachPoint which also stops at range cells from the surface.
      return edgeDistBetweenEntities(this, entity)
    }
    if (this.effectiveAttackRange() > 2) {
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
