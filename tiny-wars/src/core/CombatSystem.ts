import type { GameState } from './GameState'
import { Building } from './entities/Building'
import { Troop } from './entities/Troop'
import { EntityKind } from './types'
import { Owner } from './types'
import { CELL_SIZE } from '@data/GameConstants'
import { towerLaneFromCol } from './DeployZones'
import { opponentOf } from './DeployPerspective'

export function resolveDeaths(state: GameState): void {
  // Remove dead non-tower entities
  for (const [id, entity] of state.entities) {
    if (!entity.isAlive) {
      if (entity.kind === EntityKind.BUILDING) {
        const building = entity as Building
        building.applyDeathSplash(state)
        state.events.push({
          type: 'DEATH',
          entityId: id,
          position: { ...entity.position },
          cardId: building.cardId,
          deathSplashRadius: building.stats.deathSplashRadius,
        })
      } else if (entity.kind === EntityKind.TROOP) {
        const troop = entity as Troop
        troop.applyDeathNova(state)
        state.events.push({
          type: 'DEATH',
          entityId: id,
          position: { ...entity.position },
          cardId: troop.cardId,
          deathSplashRadius: troop.stats.deathSplashRadius,
        })
      } else {
        state.events.push({ type: 'DEATH', entityId: id, position: { ...entity.position } })
      }
      state.entities.delete(id)
    }
  }

  // Check for dead towers → award crowns
  for (const [, tower] of state.towers) {
    if (!tower.isAlive) {
      const crownOwner = tower.owner === Owner.PLAYER ? Owner.BOT : Owner.PLAYER
      if (crownOwner === Owner.PLAYER) {
        if (state.playerCrowns < 3) {
          state.playerCrowns++
          state.events.push({ type: 'CROWN_LOST', owner: tower.owner, towerId: tower.id })
        }
      } else {
        if (state.botCrowns < 3) {
          state.botCrowns++
          state.events.push({ type: 'CROWN_LOST', owner: tower.owner, towerId: tower.id })
        }
      }

      // If King Tower destroyed → immediate win
      if (tower.isKing) {
        state.phase = 'ENDED'
        state.winner = crownOwner
      }

      // Activate friendly King Tower when a Princess Tower dies
      if (!tower.isKing) {
        const col = Math.floor(tower.position.x / CELL_SIZE)
        const lane = towerLaneFromCol(col)
        state.enemyLaneDeploy[opponentOf(tower.owner)][lane] = true

        for (const [, t] of state.towers) {
          if (t.owner === tower.owner && t.isKing) {
            t.activate()
          }
        }
      }

      // Remove from map (keep record via crown events)
      state.towers.delete(tower.id)
    }
  }
}

export function checkTimeWin(state: GameState, elapsedMs: number): void {
  if (state.phase !== 'BATTLE') return
  if (elapsedMs < 180_000) return

  state.phase = 'ENDED'
  if (state.playerCrowns > state.botCrowns) {
    state.winner = Owner.PLAYER
  } else if (state.botCrowns > state.playerCrowns) {
    state.winner = Owner.BOT
  } else {
    // Tie — no winner (or add overtime logic later)
    state.winner = null
  }
}
