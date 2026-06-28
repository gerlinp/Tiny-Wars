import { Entity, nextEntityId } from './Entity'
import { Troop } from './Troop'
import { EntityKind, UnitType } from '../types'
import type { Owner, SpellStats, Vec2 } from '../types'
import type { GameState } from '../GameState'
import type { Grid } from '../Grid'
import { dist } from '../Vector2'
import { CELL_SIZE, TROOP_DEPLOY_SPREAD_CELLS } from '@data/GameConstants'
import { CARD_DEFINITIONS } from '@data/CardData'
import { troopDeployPositions } from '@core/DeploySystem'

export class Spell extends Entity {
  readonly stats: SpellStats
  private applied = false
  private readonly impactAtMs: number
  private readonly grid: Grid | null

  constructor(
    owner: Owner,
    stats: SpellStats,
    position: Vec2,
    cardId: string,
    impactAtMs: number,
    grid: Grid | null = null,
  ) {
    super(nextEntityId(), owner, EntityKind.SPELL, position, 1, cardId)
    this.stats = stats
    this.impactAtMs = impactAtMs
    this.grid = grid
  }

  tick(_deltaMs: number, state: GameState): void {
    if (this.applied) return
    if (state.elapsedMs < this.impactAtMs) return
    this.apply(state)
  }

  private apply(state: GameState): void {
    this.applied = true
    const radiusPx = this.stats.radius * CELL_SIZE

    for (const entity of state.entities.values()) {
      if (entity.owner === this.owner) continue
      if (!entity.isAlive) continue
      if (entity.kind === EntityKind.SPELL) continue
      if (this.stats.groundOnly && entity.kind === EntityKind.TROOP) {
        const unitType = (entity as Troop).stats.unitType
        if (unitType === UnitType.AIR) continue
      }
      if (dist(this.position, entity.position) <= radiusPx) {
        entity.takeDamage(this.stats.damage)
        state.events.push({ type: 'DAMAGE', targetId: entity.id, amount: this.stats.damage })
      }
    }

    for (const tower of state.towers.values()) {
      if (tower.owner === this.owner) continue
      if (!tower.isAlive) continue
      if (dist(this.position, tower.position) <= radiusPx) {
        tower.takeDamage(this.stats.damage)
        state.events.push({ type: 'DAMAGE', targetId: tower.id, amount: this.stats.damage })
      }
    }

    if (this.stats.spawnCardId && this.grid) {
      const spawnDef = CARD_DEFINITIONS[this.stats.spawnCardId]
      if (spawnDef?.stats) {
        const count = this.stats.spawnCount ?? spawnDef.deployCount ?? 1
        const positions = troopDeployPositions(this.position, count, TROOP_DEPLOY_SPREAD_CELLS)
        for (const pos of positions) {
          const troop = new Troop(this.owner, spawnDef.stats, pos, this.grid, spawnDef.id)
          state.entities.set(troop.id, troop)
          state.events.push({ type: 'DEPLOY', entityId: troop.id, cardId: spawnDef.id, position: pos })
        }
      }
    }

    state.events.push({
      type: 'SPELL_IMPACT',
      cardId: this.cardId ?? 'tnt',
      position: { ...this.position },
      radius: radiusPx,
    })

    this.hp = 0
  }
}
