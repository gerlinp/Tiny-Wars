import type { GameState } from './GameState'
import { Building } from './entities/Building'
import { Troop } from './entities/Troop'
import { EntityKind } from './types'
import { Owner } from './types'
import { CELL_SIZE, GAME_DURATION_MS, OVERTIME_DURATION_MS, TIE_BREAK_TOWER_DPS } from '@data/GameConstants'
import { towerLaneFromCol, opponentOf } from './DeploySystem'

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
          owner: building.owner,
        })
      } else if (entity.kind === EntityKind.TROOP) {
        const troop = entity as Troop
        troop.applyDeathNova(state)
        // Pig Shaman hex (CR Mother Witch) — dying while cursed spawns the curser's Pig.
        // Map insertion during iteration is safe; the new pig is alive so this loop skips it.
        troop.applyCurseTransform(state)
        state.events.push({
          type: 'DEATH',
          entityId: id,
          position: { ...entity.position },
          cardId: troop.cardId,
          deathSplashRadius: troop.stats.deathSplashRadius,
          owner: troop.owner,
          targetPosition: troop.getDeathNovaCenter(),
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

        // Overtime sudden death — first crown wins
        if (state.phase === 'OVERTIME') {
          state.phase = 'ENDED'
          state.winner = crownOwner
        }

        // Tiebreaker — first tower to fall loses
        if (state.phase === 'TIE_BREAK') {
          state.phase = 'ENDED'
          state.winner = crownOwner
        }
      }

      // Remove from map (keep record via crown events)
      state.towers.delete(tower.id)
    }
  }
}

export function checkTimeWin(state: GameState, elapsedMs: number): void {
  if (state.phase === 'BATTLE') {
    if (elapsedMs < GAME_DURATION_MS) return

    if (state.playerCrowns !== state.botCrowns) {
      state.phase = 'ENDED'
      state.winner = state.playerCrowns > state.botCrowns ? Owner.PLAYER : Owner.BOT
      return
    }

    state.phase = 'OVERTIME'
    return
  }

  if (state.phase === 'OVERTIME') {
    const overtimeMs = elapsedMs - GAME_DURATION_MS
    if (overtimeMs < OVERTIME_DURATION_MS) return

    if (state.playerCrowns !== state.botCrowns) {
      state.phase = 'ENDED'
      state.winner = state.playerCrowns > state.botCrowns ? Owner.PLAYER : Owner.BOT
      return
    }

    state.phase = 'TIE_BREAK'
    return
  }
}

/** Drain all remaining towers equally — CR-style tiebreaker after overtime. */
export function tickTowerTieBreak(state: GameState, deltaMs: number): void {
  if (state.phase !== 'TIE_BREAK') return

  const damage = (TIE_BREAK_TOWER_DPS * deltaMs) / 1000
  for (const tower of state.towers.values()) {
    if (!tower.isAlive) continue
    tower.takeDamage(damage)
  }
}
