import { Entity, nextEntityId } from './Entity'
import { EntityKind, BuildingState, AttackType, UnitType } from '../types'
import type { Owner, EntityStats, Vec2 } from '../types'
import type { GameState } from '../GameState'
import { surfaceDistToEntity, buildingBlockedCells } from '../EntityGeometry'
import { refreshStickyTarget } from '../TargetSelection'
import { dealAreaDamage } from '../AreaDamage'
import { BUILDING_COMBAT_RADIUS_CELLS, BUILDING_FOOTPRINT_CELLS, BUILDING_LIFETIME_MS, CELL_SIZE } from '@data/GameConstants'

export class Building extends Entity {
  readonly stats: EntityStats
  /** Pathfinding footprint half-width (grid tiles, not sprite size). */
  readonly pathHalfW: number
  /** Pathfinding footprint half-height (grid tiles, not sprite size). */
  readonly pathHalfH: number
  readonly combatRadiusPx: number
  readonly blockedCells: readonly Vec2[]
  readonly totalLifetimeMs: number
  private remainingLifetimeMs: number
  state: BuildingState = BuildingState.IDLE

  private attackCooldownMs = 0
  private target: Entity | null = null

  getAttackCooldownMs(): number {
    return this.attackCooldownMs
  }

  constructor(owner: Owner, stats: EntityStats, position: Vec2, cardId: string) {
    super(nextEntityId(), owner, EntityKind.BUILDING, position, stats.maxHp, cardId)
    this.stats = stats
    this.combatRadiusPx = BUILDING_COMBAT_RADIUS_CELLS * CELL_SIZE
    this.pathHalfW = (BUILDING_FOOTPRINT_CELLS.w / 2) * CELL_SIZE
    this.pathHalfH = (BUILDING_FOOTPRINT_CELLS.h / 2) * CELL_SIZE
    this.blockedCells = buildingBlockedCells(position)
    this.totalLifetimeMs = stats.lifetimeMs ?? BUILDING_LIFETIME_MS
    this.remainingLifetimeMs = this.totalLifetimeMs
  }

  tick(deltaMs: number, state: GameState): void {
    if (!this.isAlive) return

    this.applyLifetimeDecay(deltaMs)
    if (!this.isAlive) return

    if (this.attackCooldownMs > 0) {
      this.attackCooldownMs -= deltaMs
      if (this.attackCooldownMs <= 0) this.state = BuildingState.IDLE
    }

    if (this.attackCooldownMs > 0) return

    this.state = BuildingState.IDLE

    const range = this.stats.attackRange * CELL_SIZE
    this.target = refreshStickyTarget(this.target, state, {
      owner: this.owner,
      from: this.position,
      maxDistance: range,
      includeTowers: this.targetsTowers(),
      canAttack: (entity) => this.canAttack(entity),
      distance: (from, entity) => surfaceDistToEntity(from, entity),
    })

    if (!this.target) return

    if (surfaceDistToEntity(this.position, this.target) > range) return

    this.state = BuildingState.ATTACKING
    this.performAttack(state, this.target)
    this.attackCooldownMs = 1000 / this.stats.attackRate
  }

  /** Death bomb — CR Bomb Tower hits air and ground in a large radius. */
  applyDeathSplash(state: GameState): void {
    const radius = this.stats.deathSplashRadius
    if (!radius) return

    dealAreaDamage(
      state,
      this.owner,
      this.position,
      radius,
      this.stats.damage,
      () => true,
      this.id,
    )
  }

  private performAttack(state: GameState, primary: Entity): void {
    const splash = this.stats.splashRadius
    if (splash && splash > 0) {
      dealAreaDamage(
        state,
        this.owner,
        primary.position,
        splash,
        this.stats.damage,
        (entity) => this.canAttack(entity),
        this.id,
        primary.id,
      )
      return
    }

    primary.takeDamage(this.stats.damage)
    state.events.push({
      type: 'DAMAGE',
      targetId: primary.id,
      amount: this.stats.damage,
      attackerId: this.id,
    })
  }

  private targetsTowers(): boolean {
    return this.stats.attackType === AttackType.AIR_AND_GROUND
  }

  private canAttack(entity: Entity): boolean {
    if (entity.kind === EntityKind.TOWER) {
      return this.targetsTowers()
    }

    const at = this.stats.attackType
    if (at === AttackType.AIR_AND_GROUND) return true

    const troopType = (entity as { stats?: EntityStats }).stats?.unitType
    if (!troopType) return true
    if (at === AttackType.AIR_ONLY) return troopType === UnitType.AIR
    if (at === AttackType.GROUND_ONLY) return troopType === UnitType.GROUND
    return true
  }

  /** HP cap drops linearly over lifetime — matches Java remainingFrameCount expiry. */
  private applyLifetimeDecay(deltaMs: number): void {
    this.remainingLifetimeMs = Math.max(0, this.remainingLifetimeMs - deltaMs)
    const fraction = this.remainingLifetimeMs / this.totalLifetimeMs
    const hpCap = this.maxHp * fraction
    if (this.hp > hpCap) this.hp = hpCap
    if (this.remainingLifetimeMs <= 0) this.hp = 0
  }
}
