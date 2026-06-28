import { describe, it, expect } from 'vitest'
import { Spell } from '@core/entities/Spell'
import { createInitialGameState } from '@core/GameState'
import { Owner } from '@core/types'

describe('Spell', () => {
  it('applies splash damage when elapsed time reaches impactAtMs', () => {
    const state = createInitialGameState()
    const spell = new Spell(
      Owner.PLAYER,
      { damage: 493, radius: 2, duration: 0 },
      { x: 230, y: 110 },
      'tnt',
      1000,
    )
    state.entities.set(spell.id, spell)

    state.elapsedMs = 999
    spell.tick(1, state)
    expect(state.events.some(e => e.type === 'SPELL_IMPACT')).toBe(false)

    state.elapsedMs = 1000
    spell.tick(1, state)
    expect(state.events.some(e => e.type === 'SPELL_IMPACT')).toBe(true)
    expect(spell.hp).toBe(0)
  })
})
