import { Entity, nextEntityId } from './Entity'
import { EntityKind, TroopState, UnitType, Owner, DEFAULT_TARGET_PRIORITY } from '../types'
import type { EntityStats, TargetClass, Vec2 } from '../types'
import type { GameState } from '../GameState'
import type { Grid } from '../Grid'
import { Pathfinder } from '../Pathfinder'
import {

  buildingCombatCenter,
  edgeDistBetweenEntities,
  entityCollisionCenter,
  entityCombatRadius,
  meleeApproachPoint,
  pushTroopOutOfEntity,
  surfaceDistToEntity,
  troopCollisionRadius,
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
import { kingTowerRangedAttackPoint, towerSlotOriginCenter } from '@rendering/towerRenderPosition'
import { bombTowerMeleeLayout } from '@data/BombTowerMeleeLayout'
import { kingTowerMeleeLayout } from '@data/KingTowerMeleeLayout'
import { princessTowerMeleeLayout } from '@data/PrincessTowerMeleeLayout'
import { BOMB_TOWER_CARD_ID } from '@data/GameConstants'
import type { Building } from './Building'
import { moveTowardWithAllyAvoidance } from '../TroopAvoidance'
import { troopDeployPositions } from '../DeploySystem'
import { CARD_DEFINITIONS } from '@data/CardData'
import {
  CELL_SIZE, EPSILON_DISTANCE,
  LEFT_LANE_COL, RIGHT_LANE_COL, RIVER_ROW_START, RIVER_ROW_END,
  LEFT_BRIDGE_COLS, RIGHT_BRIDGE_COLS,
  HEAL_PULSE_INTERVAL_MS,
  TROOP_DEPLOY_SPREAD_CELLS, BRIDGE_CENTER_COL,
  TROOP_SPAWN_DELAY_MS, TROOP_AGGRO_RANGE_CELLS,
} from '@data/GameConstants'
import {
  GNOLL_BOOMERANG_TRAVEL_CELLS,
  THIEF_DASH_RANGE_CELLS, THIEF_DASH_WINDUP_MS, THIEF_DASH_SPEED_MULT,
  LANCER_CHARGE_DISTANCE_CELLS, LANCER_CHARGE_SPEED_MULT, LANCER_CHARGE_DAMAGE_MULT,
  HOOK_MIN_RANGE_CELLS, HOOK_MAX_RANGE_CELLS, HOOK_WINDUP_MS, HOOK_SLOW_DURATION_MS, HOOK_SLOW_SPEED_MULT,
  GOBLIN_DEMOLISHER_CHARGE_HP_FRACTION, GOBLIN_DEMOLISHER_CHARGE_SPEED_CR, GOBLIN_DEMOLISHER_CHARGE_ATTACK_RANGE,
  SPIDER_MINION_CARD_ID, SPIDER_MINION_SPAWN_COUNT, SPIDER_MINION_SPAWN_INTERVAL_MS, SPIDER_MINION_SPAWN_INITIAL_DELAY_MS,
  VOODOO_SHAMAN_MINION_CARD_ID, VOODOO_SHAMAN_MINION_SPAWN_COUNT, VOODOO_SHAMAN_MINION_SPAWN_INTERVAL_MS,
  LIGHTNING_SHAMAN_CHAIN_RANGE_PX,
  MONK_HEAL_PER_PULSE, MONK_HEAL_PULSE_COUNT, MONK_HEAL_RADIUS,
  MONK_SPAWN_HEAL_PER_PULSE, MONK_SPAWN_HEAL_PULSE_COUNT, MONK_SPAWN_HEAL_RADIUS,
} from '@data/CardAbilities'

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
/**
 * Once in ATTACKING state, the unit stays attacking even if the target drifts up to this many
 * pixels beyond attackReach — prevents single-tick walk/attack oscillation from separation pushes.
 */
const ATTACK_HOLD_SLACK_PX = CELL_SIZE * 0.5

/** Map an entity to its target-priority class. */
function entityTargetClass(entity: Entity): TargetClass {
  if (entity.kind === EntityKind.TROOP) return 'troop'
  if (entity.kind === EntityKind.BUILDING) return 'building'
  return (entity as Tower).isKing ? 'king' : 'tower'
}

/** Index of a class in the priority list; unranked classes sort last. */
function targetPriorityIndex(priority: readonly TargetClass[], cls: TargetClass): number {
  const i = priority.indexOf(cls)
  return i < 0 ? priority.length : i
}

/** Bridge column in `band` nearest the unit's current column — spreads crossings across the bridge width. */
export function nearestBridgeColumn(unitCol: number, band: readonly number[]): number {
  let best = band[0]!
  let bestDist = Infinity
  for (const col of band) {
    const d = Math.abs(unitCol - col)
    if (d < bestDist) {
      bestDist = d
      best = col
    }
  }
  return best
}

export class Troop extends Entity {
  readonly stats: EntityStats
  state: TroopState = TroopState.WALKING

  private attackCooldownMs = 0

  getAttackCooldownMs(): number {
    return this.attackCooldownMs
  }

  /** Movement speed in grid cells/sec — includes charge boost, dash leap, and slow debuffs. */
  getEffectiveSpeed(): number {
    let speed = (this.cardId === 'goblin_demolisher' && this.buildingChargeRunActive)
      ? GOBLIN_DEMOLISHER_CHARGE_SPEED_CR * (1.5 / 60)  // crSpeedToCellsPerSec(veryFast)
      : this.stats.speed
    if (this.isCharging && this.cardId === 'lancer') speed *= LANCER_CHARGE_SPEED_MULT
    if (this.isDashing && this.dashWindupMsRemaining <= 0 && this.cardId === 'thief') {
      speed *= THIEF_DASH_SPEED_MULT
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
    if (this.cardId !== 'gnoll') return false
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
  private spawnTimerMs = 0

  constructor(owner: Owner, stats: EntityStats, position: Vec2, grid: Grid, cardId: string) {
    super(nextEntityId(), owner, EntityKind.TROOP, position, stats.maxHp, cardId)
    this.stats = stats
    this.armorHp = stats.armorHp ?? 0
    this.grid = grid
    this.pathfinder = new Pathfinder(grid)
    this.lastMarchDir = owner === Owner.PLAYER ? { x: 0, y: -1 } : { x: 0, y: 1 }
    this.spawnLane = position.x < BRIDGE_CENTER_COL * CELL_SIZE ? 'left' : 'right'
    if (cardId === 'spider' || cardId === 'voodoo_shaman') {
      this.spawnMinionCooldownMs = SPIDER_MINION_SPAWN_INITIAL_DELAY_MS
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

  /** Activate the CR-style spawn freeze so the unit idles before acting. */
  applySpawnDelay(): void {
    this.spawnTimerMs = TROOP_SPAWN_DELAY_MS
  }

  /** Deploy-time heal aura (e.g. Monk spawn heal). */
  applySpawnHeal(state: GameState): void {
    if (this.cardId !== 'monk') return
    this.startHealBurst(state, MONK_SPAWN_HEAL_RADIUS, MONK_SPAWN_HEAL_PER_PULSE, MONK_SPAWN_HEAL_PULSE_COUNT)
  }

  /** World point the unit is striking toward — for directional attack anims and dash facing. */
  getAttackAimPoint(): Vec2 | null {
    const aimTarget = this.getAimTarget()
    if (!aimTarget?.isAlive) return null
    return this.moveGoalFor(aimTarget)
  }

  /** Current strike / dash / hook target — for rendering aim overrides. */
  getAimTarget(): Entity | null {
    if (this.isDashing) return this.dashTargetEntity
    if (this.isHooking) return this.hookTargetEntity
    if (this.state === TroopState.ATTACKING) return this.target
    return null
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

    if (this.spawnTimerMs > 0) {
      this.spawnTimerMs -= deltaMs
      this.state = TroopState.SPAWNING
      return
    }

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

      if (this.cardId === 'gnoll' && isBoomerangThrowerBusy(state, this.id)) {
        this.state = TroopState.ATTACKING
        this.clearPath()
        this.trackObjective(this.target)
        return
      }

      // Hysteresis: once attacking, tolerate the target drifting slightly past attackReach
      // (e.g. from separation pushes) before dropping back to walking. Prevents single-tick
      // walk/attack oscillation that makes melee feel janky.
      const holdReach = this.state === TroopState.ATTACKING
        ? attackReach + ATTACK_HOLD_SLACK_PX
        : attackReach
      if (dist <= holdReach) {
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
      this.moveFree(deltaMs, this.attackGoalFor(this.target, state), state)
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
    if (this.cardId === 'gnoll') {
      launchBoomerang(state, this, primary, GNOLL_BOOMERANG_TRAVEL_CELLS, damage)
      this.resetCharge()
      return
    }
    const splash = this.stats.splashRadius
    if (splash && splash > 0) {
      this.dealSplashDamage(state, primary.position, primary.id, damage)
    } else {
      this.dealDamageTo(state, primary, false, damage)
    }
    if (this.cardId === 'lightning_shaman') {
      this.dealChainLightning(state, primary, damage)
    }
    this.resetCharge()
    this.applyActiveHeal(state)
  }

  private dealChainLightning(state: GameState, primary: Entity, damage: number): void {
    let nearest: Entity | null = null
    let nearestDist = Infinity
    for (const entity of state.entities.values()) {
      if (entity.id === primary.id) continue
      if (entity.owner === this.owner || !entity.isAlive) continue
      if (!this.canAttack(entity)) continue
      const d = dist(primary.position, entity.position)
      if (d <= LIGHTNING_SHAMAN_CHAIN_RANGE_PX && d < nearestDist) {
        nearest = entity
        nearestDist = d
      }
    }
    if (!nearest) {
      for (const tower of state.towers.values()) {
        if (tower.owner === this.owner || !tower.isAlive) continue
        const d = dist(primary.position, tower.position)
        if (d <= LIGHTNING_SHAMAN_CHAIN_RANGE_PX && d < nearestDist) {
          nearest = tower
          nearestDist = d
        }
      }
    }
    if (!nearest) return
    nearest.takeDamage(damage)
    state.events.push({
      type: 'DAMAGE',
      targetId: nearest.id,
      amount: damage,
      attackerId: this.id,
      splash: false,
      chainFrom: primary.position,
    })
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
    if (this.cardId !== 'goblin_demolisher' || this.maxHp <= 0) return null
    return Math.floor(this.maxHp * GOBLIN_DEMOLISHER_CHARGE_HP_FRACTION)
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
    if (this.cardId === 'goblin_demolisher' && this.isBuildingChargeMode()) {
      return GOBLIN_DEMOLISHER_CHARGE_ATTACK_RANGE
    }
    return this.stats.attackRange
  }

  private effectiveTargetsBuildingsOnly(): boolean {
    return this.isBuildingChargeMode() || this.stats.targetsBuildingsOnly === true
  }

  private applyActiveHeal(state: GameState): void {
    if (this.cardId !== 'monk') return
    this.startHealBurst(state, MONK_HEAL_RADIUS, MONK_HEAL_PER_PULSE, MONK_HEAL_PULSE_COUNT)
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
    if (this.cardId === 'voodoo_shaman') {
      this.spawnMinionCooldownMs = VOODOO_SHAMAN_MINION_SPAWN_INTERVAL_MS
    } else {
      this.spawnMinionCooldownMs = SPIDER_MINION_SPAWN_INTERVAL_MS
    }
  }

  private spawnMinions(state: GameState): void {
    let minionCardId: string
    let count: number
    if (this.cardId === 'voodoo_shaman') {
      minionCardId = VOODOO_SHAMAN_MINION_CARD_ID
      count = VOODOO_SHAMAN_MINION_SPAWN_COUNT
    } else if (this.cardId === 'spider') {
      minionCardId = SPIDER_MINION_CARD_ID
      count = SPIDER_MINION_SPAWN_COUNT
    } else {
      return
    }

    const spawnDef = CARD_DEFINITIONS[minionCardId]
    if (!spawnDef?.stats) return

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
    if (this.isCharging && this.cardId === 'lancer') {
      damage = Math.round(damage * LANCER_CHARGE_DAMAGE_MULT)
    }
    return damage
  }

  private hasOpeningDash(): boolean {
    return this.cardId === 'thief'
  }

  private canStartOpeningDash(distPx: number): boolean {
    if (!this.hasOpeningDash() || this.attackCooldownMs > 0) return false
    const dashReachPx = THIEF_DASH_RANGE_CELLS * CELL_SIZE
    return distPx <= dashReachPx && distPx > this.stats.attackRange * CELL_SIZE
  }

  private startOpeningDash(target: Entity): void {
    this.isDashing = true
    this.dashWindupMsRemaining = THIEF_DASH_WINDUP_MS
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
    return this.cardId === 'harpoon_shark'
  }

  private canStartHook(distPx: number): boolean {
    if (!this.hasHookAttack() || this.attackCooldownMs > 0) return false
    const minPx = HOOK_MIN_RANGE_CELLS * CELL_SIZE
    const maxPx = HOOK_MAX_RANGE_CELLS * CELL_SIZE
    return distPx >= minPx && distPx <= maxPx
  }

  private startHook(target: Entity): void {
    this.isHooking = true
    this.hookWindupMsRemaining = HOOK_WINDUP_MS
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
      HOOK_SLOW_DURATION_MS,
      HOOK_SLOW_SPEED_MULT,
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
    return this.cardId === 'lancer'
  }

  private recordWalkDistance(cellsMoved: number): void {
    if (!this.hasChargeAbility() || cellsMoved <= 0) return
    this.walkDistanceCells += cellsMoved
    if (!this.isCharging && this.walkDistanceCells >= LANCER_CHARGE_DISTANCE_CELLS) {
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
      if (surfaceDistToEntity(center, tower) > radiusPx) continue
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

  /** Goal while closing on a target: use attack slots for both melee and ranged swarms, else standoff point. */
  private attackGoalFor(target: Entity, state: GameState): Vec2 {
    if (this.effectiveAttackRange() <= 2) {
      const slot = this.attackSlotGoalFor(target, state)
      if (slot) return slot
    } else if (target.kind === EntityKind.TOWER) {
      const slot = this.rangedTowerSlotGoalFor(target as Tower, state)
      if (slot) return slot
    }
    return this.moveGoalFor(target)
  }

  /**
   * Swarm surround: steer this unit toward its nearest *open* (unclaimed) attack slot
   * around the target.
   *
   * Assignment algorithm (O(attackers × slots)):
   *   For each slot, find the attacker closest to it → that attacker exclusively claims it.
   *   This unit uses whichever slot it won. If the swarm is larger than the slot count,
   *   overflow units fall back to the nearest slot overall (they'll physically push/spread
   *   via collision resolution).
   *
   * Returns null for solo attackers (direct approach used) or when no walkable slot exists.
   */
  private attackSlotGoalFor(target: Entity, state: GameState): Vec2 | null {
    if (this.effectiveTargetsBuildingsOnly()) return null

    // Collect all melee allies attacking this target (including this unit).
    const attackers: { id: string; pos: Vec2 }[] = []
    for (const entity of state.entities.values()) {
      if (!entity.isAlive || entity.kind !== EntityKind.TROOP) continue
      if (entity.owner !== this.owner) continue
      const ally = entity as Troop
      if (ally.target?.id !== target.id) continue
      if (ally.effectiveAttackRange() > 2) continue
      attackers.push({ id: ally.id, pos: ally.position })
    }
    if (attackers.length <= 1) return null

    if (target.kind === EntityKind.TOWER) {
      const tower = target as Tower
      const layout = tower.isKing
        ? kingTowerMeleeLayout(tower.owner)
        : princessTowerMeleeLayout(tower.owner, false)
      if (layout) {
        const origin = towerSlotOriginCenter(
          tower.position.x, tower.position.y, tower.owner, tower.isKing,
        )
        return this.nearestOpenSlot(origin, layout.slotPositions, attackers)
      }
    }

    if (target.kind === EntityKind.BUILDING && target.cardId === BOMB_TOWER_CARD_ID) {
      const building = target as Building
      const origin = buildingCombatCenter(building)
      return this.nearestOpenSlot(origin, bombTowerMeleeLayout().slotPositions, attackers)
    }

    // Troop target — use a virtual radial ring for melee contact spacing.
    const center = entityCollisionCenter(target)
    const targetRadius = entityCombatRadius(target) ?? troopCollisionRadius(this)
    const attackerRadius = troopCollisionRadius(this)
    const rangePx = this.effectiveAttackRange() * CELL_SIZE
    const slotRadius = Math.max(0, targetRadius + attackerRadius + rangePx - CELL_SIZE * 0.5)
    const total = Math.max(attackers.length, 8) // at least 8 virtual slots for spread
    const virtualSlots = Array.from({ length: total }, (_, i) => {
      const a = (Math.PI * 2 * i) / total
      return { x: (Math.cos(a) * slotRadius) / CELL_SIZE, y: (Math.sin(a) * slotRadius) / CELL_SIZE }
    })
    return this.nearestOpenSlot(center, virtualSlots, attackers)
  }

  /**
   * Ranged tower approach slots: spread ranged allies around a standoff ring so they
   * don't stack on one point while trying to fire at the same tower/king.
   */
  private rangedTowerSlotGoalFor(tower: Tower, state: GameState): Vec2 | null {
    const attackers: { id: string; pos: Vec2 }[] = []
    for (const entity of state.entities.values()) {
      if (!entity.isAlive || entity.kind !== EntityKind.TROOP) continue
      if (entity.owner !== this.owner) continue
      const ally = entity as Troop
      if (ally.target?.id !== tower.id) continue
      if (ally.effectiveAttackRange() <= 2) continue
      attackers.push({ id: ally.id, pos: ally.position })
    }
    if (attackers.length <= 1) return null

    const rangePx = this.effectiveAttackRange() * CELL_SIZE
    const slotRadius = Math.max(0, rangePx - CELL_SIZE * 0.5)
    const total = Math.max(attackers.length, 12)
    const slots = Array.from({ length: total }, (_, i) => {
      const a = (Math.PI * 2 * i) / total
      return { x: (Math.cos(a) * slotRadius) / CELL_SIZE, y: (Math.sin(a) * slotRadius) / CELL_SIZE }
    })
    const origin = tower.isKing
      ? kingTowerRangedAttackPoint(tower.position.x, tower.position.y, tower.owner)
      : tower.position
    return this.nearestOpenSlot(origin, slots, attackers)
  }

  /**
   * Exclusive greedy slot assignment: each slot is awarded to whichever attacker is
   * closest to it. Ties broken by ID for determinism. This unit receives its won slot;
   * overflow units (more attackers than slots) get the globally nearest walkable slot.
   */
  private nearestOpenSlot(
    origin: Vec2,
    slots: readonly { x: number; y: number }[],
    attackers: readonly { id: string; pos: Vec2 }[],
  ): Vec2 | null {
    if (slots.length === 0) return null

    // Materialise world positions, filter to walkable slots only.
    const worldSlots: (Vec2 | null)[] = slots.map(s => {
      const wx = origin.x + s.x * CELL_SIZE
      const wy = origin.y + s.y * CELL_SIZE
      if (this.stats.unitType === UnitType.GROUND && !isWorldWalkable(this.grid, wx, wy)) return null
      return { x: wx, y: wy }
    })

    // For each walkable slot find the nearest attacker (owner of that slot).
    const slotOwner: (string | null)[] = worldSlots.map(slot => {
      if (!slot) return null
      let bestId: string | null = null
      let bestDist = Infinity
      for (const a of attackers) {
        const dx = a.pos.x - slot.x
        const dy = a.pos.y - slot.y
        const d = dx * dx + dy * dy
        if (d < bestDist || (d === bestDist && (bestId === null || a.id < bestId))) {
          bestDist = d
          bestId = a.id
        }
      }
      return bestId
    })

    // Return the slot this unit won that is nearest to its current position.
    let bestSlot: Vec2 | null = null
    let bestDistSq = Infinity
    for (let i = 0; i < worldSlots.length; i++) {
      const slot = worldSlots[i]
      if (!slot || slotOwner[i] !== this.id) continue
      const dx = this.position.x - slot.x
      const dy = this.position.y - slot.y
      const dSq = dx * dx + dy * dy
      if (dSq < bestDistSq) { bestDistSq = dSq; bestSlot = slot }
    }
    if (bestSlot) return bestSlot

    // Overflow: more attackers than slots — go to the nearest walkable slot.
    for (let i = 0; i < worldSlots.length; i++) {
      const slot = worldSlots[i]
      if (!slot) continue
      const dx = this.position.x - slot.x
      const dy = this.position.y - slot.y
      const dSq = dx * dx + dy * dy
      if (dSq < bestDistSq) { bestDistSq = dSq; bestSlot = slot }
    }
    return bestSlot
  }

  private moveGoalFor(target: Entity): Vec2 {
    const range = this.effectiveAttackRange()
    if (target.kind === EntityKind.TOWER && range > 2) {
      // Ranged vs tower: stand off at `range` cells from the tower's LOGIC POSITION (not
      // its attack centre). The tower's attack centre is intentionally placed off-map for
      // king towers (behind the king) to give the tower a wide arc of fire — but using
      // that off-map point as the troop standoff target forces ranged units to march all
      // the way to the king's doorstep. Use tower.position (logic anchor) so troops stop
      // at the intended standoff ring. combatDistTo is matched to the same reference.
      const tower = target as Tower
      const center = tower.position
      const dx = this.position.x - center.x
      const dy = this.position.y - center.y
      const d = Math.hypot(dx, dy)
      if (d < EPSILON_DISTANCE) return { x: this.position.x, y: this.position.y }
      // Stop a touch inside range (half a cell) so float rounding never parks the unit
      // just outside its own attack check.
      const standoff = Math.max(0, range * CELL_SIZE - CELL_SIZE * 0.5)
      return { x: center.x + (dx / d) * standoff, y: center.y + (dy / d) * standoff }
    }
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
    for (const entity of state.entities.values()) {
      if (!entity.isAlive || entity.kind !== EntityKind.BUILDING) continue
      if (entity.owner === this.owner) continue
      // Melee chasers must hug the building hull to reach short attack ranges (e.g. pigs).
      if (this.target?.id === entity.id && this.effectiveAttackRange() <= 2) continue
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
    // Pick the bridge on the unit's own side, then fan across its 3-cell width by crossing on
    // the band column nearest the unit's current column. Units approaching at different x spread
    // over the bridge instead of all snapping to the lane centre (CR-style funneling).
    const onLeftSide = Math.abs(unitCol - LEFT_LANE_COL) <= Math.abs(unitCol - RIGHT_LANE_COL)
    const bridgeCols = onLeftSide ? LEFT_BRIDGE_COLS : RIGHT_BRIDGE_COLS
    const laneCol = nearestBridgeColumn(unitCol, bridgeCols)

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
    // CR: all units have sight range ≥ 5.5 tiles, regardless of attack range.
    // Previously ranged units only noticed enemies within their attack range; this
    // caused them to walk into enemies before registering them as targets.
    let aggro = Math.max(range, TROOP_AGGRO_RANGE_CELLS)
    // Special long-reach melee cards must detect targets out to their ability range so the
    // dash / hook can trigger before the unit is in normal melee range.
    if (this.cardId === 'thief') aggro = Math.max(aggro, THIEF_DASH_RANGE_CELLS)
    if (this.cardId === 'harpoon_shark') aggro = Math.max(aggro, HOOK_MAX_RANGE_CELLS)
    return aggro
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
    const engagedTarget = this.target?.isAlive ? this.target : null
    const engagedOnTroop = engagedTarget?.kind === EntityKind.TROOP

    // CR: once locked on a live troop target, never re-evaluate — fight to the death.
    // No leash, no switching to a closer enemy mid-chase.
    if (engagedOnTroop && !this.effectiveTargetsBuildingsOnly()) return

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

    const structureCandidate = this.stickyStructureTarget(structureTarget, state)
    this.target = this.pickByPriority(troopTarget, structureCandidate, state)
  }

  /**
   * Choose between a troop candidate and a structure candidate by this unit's
   * {@link EntityStats.targetPriority} (most-preferred class first), tie-broken by distance.
   * The default order keeps troops preferred over structures (legacy behavior).
   */
  private pickByPriority(
    troopTarget: Entity | null,
    structureTarget: Entity | null,
    state: GameState,
  ): Entity | null {
    if (!troopTarget) return structureTarget
    if (!structureTarget) return troopTarget

    const priority = this.stats.targetPriority ?? DEFAULT_TARGET_PRIORITY
    const troopRank = targetPriorityIndex(priority, entityTargetClass(troopTarget))
    const structureRank = targetPriorityIndex(priority, entityTargetClass(structureTarget))
    if (troopRank !== structureRank) return troopRank < structureRank ? troopTarget : structureTarget

    return this.engageDistTo(troopTarget, state) <= this.engageDistTo(structureTarget, state)
      ? troopTarget
      : structureTarget
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
    const ranged = this.effectiveAttackRange() > 2
    if (entity.kind === EntityKind.TOWER && ranged) {
      if ((entity as Tower).isKing) {
        const kingTower = entity as Tower
        const attackPoint = kingTowerRangedAttackPoint(
          kingTower.position.x,
          kingTower.position.y,
          kingTower.owner,
        )
        return Math.sqrt(distSq(this.position, attackPoint))
      }
      // Ranged vs non-king towers: center-to-center from the tower logic position.
      // (King towers use a dedicated ranged attack point above.)
      return Math.sqrt(distSq(this.position, entity.position))
    }
    if (entity.kind === EntityKind.BUILDING || entity.kind === EntityKind.TOWER) {
      // Buildings (and melee vs towers): surface-to-surface so attackRange means "cells
      // from the structure edge". Matches meleeApproachPoint, which stops at range cells
      // from the surface.
      return edgeDistBetweenEntities(this, entity)
    }
    if (ranged) {
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
  getDevInfo(state: GameState): {
    waypoints: readonly Vec2[]
    goal: Vec2 | null
    targetPos: Vec2 | null
    marchGoal: Vec2 | null
  } {
    return {
      waypoints: [...this.pathWaypoints],
      goal: this.pathGoal ? { ...this.pathGoal } : null,
      // Mirror the actual movement goal (attackGoalFor) so the dev overlay shows the
      // attack-slot ring position swarms steer toward, not the bare standoff point.
      targetPos: this.target?.isAlive ? this.attackGoalFor(this.target, state) : null,
      marchGoal: this.target ? null : this.getMarchGoal(state),
    }
  }
}
