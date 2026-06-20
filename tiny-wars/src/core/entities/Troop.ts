import { Entity, nextEntityId } from './Entity'
import { EntityKind, TroopState, UnitType } from '../types'
import type { Owner, EntityStats, Vec2 } from '../types'
import type { GameState } from '../GameState'
import type { Grid } from '../Grid'
import { Pathfinder } from '../Pathfinder'
import { dist, distSq } from '../Vector2'
import { CELL_SIZE } from '@data/GameConstants'

export class Troop extends Entity {
  readonly stats: EntityStats
  state: TroopState = TroopState.WALKING

  private path: Vec2[] = []
  private pathAge = 0
  private attackCooldownMs = 0
  private target: Entity | null = null
  private readonly pathfinder: Pathfinder

  constructor(owner: Owner, stats: EntityStats, position: Vec2, grid: Grid) {
    super(nextEntityId(), owner, EntityKind.TROOP, position, stats.maxHp)
    this.stats = stats
    this.pathfinder = new Pathfinder(grid)
  }

  tick(deltaMs: number, state: GameState): void {
    if (!this.isAlive) { this.state = TroopState.DEAD; return }

    // Decrement attack cooldown
    if (this.attackCooldownMs > 0) {
      this.attackCooldownMs -= deltaMs
    }

    // Acquire or validate target
    this.target = this.acquireTarget(state)

    if (this.target) {
      const d = dist(this.position, this.target.position)
      if (d <= this.stats.attackRange) {
        this.state = TroopState.ATTACKING
        if (this.attackCooldownMs <= 0) {
          this.target.takeDamage(this.stats.damage)
          state.events.push({ type: 'DAMAGE', targetId: this.target.id, amount: this.stats.damage })
          this.attackCooldownMs = 1000 / this.stats.attackRate
        }
        return
      }
    }

    // Walk toward target (or enemy king tower if no target)
    this.state = TroopState.WALKING
    const destination = this.target?.position ?? this.enemyKingPos(state)
    this.moveToward(destination, deltaMs, state)
  }

  private moveToward(destination: Vec2, deltaMs: number, state: GameState): void {
    if (this.stats.unitType === UnitType.AIR) {
      // Air units fly straight
      const dx = destination.x - this.position.x
      const dy = destination.y - this.position.y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < 0.01) return
      const speed = (this.stats.speed * CELL_SIZE * deltaMs) / 1000
      const step = Math.min(speed, d)
      this.position.x += (dx / d) * step
      this.position.y += (dy / d) * step
      return
    }

    // Refresh path every 30 ticks (~1s at 30fps) or when target changes
    this.pathAge++
    if (this.path.length === 0 || this.pathAge >= 30) {
      const gridPos = this.worldToGrid(this.position)
      const gridDst = this.worldToGrid(destination)
      this.path = this.pathfinder.findPath(gridPos, gridDst, this.stats.unitType)
      this.pathAge = 0
    }

    if (this.path.length === 0) return

    const nextCell = this.path[0]
    const nextWorld = this.gridToWorld(nextCell)
    const dx = nextWorld.x - this.position.x
    const dy = nextWorld.y - this.position.y
    const d = Math.sqrt(dx * dx + dy * dy)
    const speed = (this.stats.speed * CELL_SIZE * deltaMs) / 1000
    const step = Math.min(speed, d)

    this.position.x += (dx / d) * step
    this.position.y += (dy / d) * step

    // Arrived at waypoint — advance path
    if (step >= d) this.path.shift()

    void state
  }

  private acquireTarget(state: GameState): Entity | null {
    const rangeSq = (this.stats.attackRange * CELL_SIZE) ** 2
    let best: Entity | null = null
    let bestDsq = Infinity

    for (const entity of state.entities.values()) {
      if (entity.owner === this.owner) continue
      if (!entity.isAlive) continue
      if (!this.canAttack(entity)) continue

      const dsq = distSq(this.position, entity.position)
      if (dsq < bestDsq) {
        bestDsq = dsq
        best = entity
      }
    }

    // Also consider opponent towers
    for (const tower of state.towers.values()) {
      if (tower.owner === this.owner) continue
      if (!tower.isAlive) continue
      const dsq = distSq(this.position, tower.position)
      if (dsq <= rangeSq && dsq < bestDsq) {
        bestDsq = dsq
        best = tower
      }
    }

    return best
  }

  private canAttack(entity: Entity): boolean {
    const at = this.stats.attackType
    if (at === 'AIR_AND_GROUND') return true
    const entityType = (entity as Troop).stats?.unitType
    if (!entityType) return true // towers/buildings always attackable
    if (at === 'AIR_ONLY')    return entityType === UnitType.AIR
    if (at === 'GROUND_ONLY') return entityType === UnitType.GROUND
    return true
  }

  private enemyKingPos(state: GameState): Vec2 {
    for (const tower of state.towers.values()) {
      if (tower.owner !== this.owner && tower.isKing) return tower.position
    }
    // Fallback: walk toward centre
    return { x: 240, y: this.owner === 0 ? 0 : 860 }
  }

  private worldToGrid(p: Vec2): Vec2 {
    return { x: Math.round(p.x / CELL_SIZE), y: Math.round(p.y / CELL_SIZE) }
  }

  private gridToWorld(g: Vec2): Vec2 {
    return { x: g.x * CELL_SIZE + CELL_SIZE / 2, y: g.y * CELL_SIZE + CELL_SIZE / 2 }
  }
}
