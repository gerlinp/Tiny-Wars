import { describe, it, expect } from 'vitest'
import { checkTimeWin, tickTowerTieBreak, resolveDeaths } from '@core/CombatSystem'
import { createInitialGameState } from '@core/GameState'
import { Tower } from '@core/entities/Tower'
import { Owner } from '@core/types'
import { GAME_DURATION_MS, OVERTIME_DURATION_MS, TIE_BREAK_TOWER_DPS } from '@data/GameConstants'
import { PRINCESS_TOWER } from '@data/TowerData'

describe('Tie break', () => {
  it('enters tie break when overtime expires tied on crowns', () => {
    const state = createInitialGameState()
    state.phase = 'OVERTIME'
    checkTimeWin(state, GAME_DURATION_MS + OVERTIME_DURATION_MS)
    expect(state.phase).toBe('TIE_BREAK')
    expect(state.winner).toBeNull()
  })

  it('drains all remaining towers during tie break', () => {
    const state = createInitialGameState()
    state.phase = 'TIE_BREAK'
    const playerTower = new Tower(Owner.PLAYER, PRINCESS_TOWER, { x: 100, y: 500 })
    const botTower = new Tower(Owner.BOT, PRINCESS_TOWER, { x: 300, y: 100 })
    state.towers.set(playerTower.id, playerTower)
    state.towers.set(botTower.id, botTower)
    const playerBefore = playerTower.hp
    const botBefore = botTower.hp

    tickTowerTieBreak(state, 1000)

    expect(playerTower.hp).toBe(playerBefore - TIE_BREAK_TOWER_DPS)
    expect(botTower.hp).toBe(botBefore - TIE_BREAK_TOWER_DPS)
  })

  it('ends the match when the first tower falls during tie break', () => {
    const state = createInitialGameState()
    state.phase = 'TIE_BREAK'
    const playerTower = new Tower(Owner.PLAYER, PRINCESS_TOWER, { x: 100, y: 500 })
    const botTower = new Tower(Owner.BOT, PRINCESS_TOWER, { x: 300, y: 100 })
    playerTower.hp = 30
    botTower.hp = 5000
    state.towers.set(playerTower.id, playerTower)
    state.towers.set(botTower.id, botTower)

    tickTowerTieBreak(state, 1000)
    resolveDeaths(state)

    expect(state.phase).toBe('ENDED')
    expect(state.winner).toBe(Owner.BOT)
    expect(state.towers.has(playerTower.id)).toBe(false)
  })
})
