import { describe, it, expect } from 'vitest'
import { CARD_ADDED_AT, CARD_DEFINITIONS, getCardAddedAtMs } from '@data/CardData'
import {
  DEFAULT_COLLECTION_SORT,
  getDeckCandidates,
  sortDeckCandidateIds,
} from '@data/PlayerDeck'

describe('CARD_ADDED_AT', () => {
  it('every collection card has a stable first-added timestamp on its definition', () => {
    for (const id of Object.keys(CARD_DEFINITIONS)) {
      expect(CARD_DEFINITIONS[id]!.addedAt, id).toBeTypeOf('number')
      expect(CARD_DEFINITIONS[id]!.addedAt).toBeGreaterThan(0)
      expect(CARD_ADDED_AT[id]).toBe(CARD_DEFINITIONS[id]!.addedAt)
      expect(getCardAddedAtMs(id)).toBe(CARD_DEFINITIONS[id]!.addedAt)
    }
  })

  it('has no entries for unknown card ids', () => {
    for (const id of Object.keys(CARD_ADDED_AT)) {
      expect(CARD_DEFINITIONS[id], id).toBeDefined()
    }
  })
})

describe('getDeckCandidates', () => {
  it('defaults to most recent cards first (desc)', () => {
    const sorted = getDeckCandidates(DEFAULT_COLLECTION_SORT)
    expect(sorted[0]).toBe('harpoon_shark')
    expect(sorted[1]).toBe('spear_goblin')
    expect(sorted[2]).toBe('pawns')
    expect(sorted[sorted.length - 1]).toBe('warrior')
  })

  it('recent asc puts oldest cards first', () => {
    const sorted = getDeckCandidates({ mode: 'recent', direction: 'asc' })
    expect(sorted[0]).toBe('warrior')
    expect(sorted[sorted.length - 1]).toBe('harpoon_shark')
  })

  it('sorts by elixir ascending', () => {
    const sorted = getDeckCandidates({ mode: 'elixir', direction: 'asc' })
    for (let i = 1; i < sorted.length; i++) {
      const prev = CARD_DEFINITIONS[sorted[i - 1]!]!
      const curr = CARD_DEFINITIONS[sorted[i]!]!
      expect(curr.elixirCost).toBeGreaterThanOrEqual(prev.elixirCost)
    }
  })

  it('sorts by elixir descending', () => {
    const sorted = getDeckCandidates({ mode: 'elixir', direction: 'desc' })
    for (let i = 1; i < sorted.length; i++) {
      const prev = CARD_DEFINITIONS[sorted[i - 1]!]!
      const curr = CARD_DEFINITIONS[sorted[i]!]!
      expect(curr.elixirCost).toBeLessThanOrEqual(prev.elixirCost)
    }
  })

  it('sorts by name ascending', () => {
    const sorted = getDeckCandidates({ mode: 'name', direction: 'asc' })
    const names = sorted.map(id => CARD_DEFINITIONS[id]!.displayName)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it('sorts by name descending', () => {
    const sorted = getDeckCandidates({ mode: 'name', direction: 'desc' })
    const names = sorted.map(id => CARD_DEFINITIONS[id]!.displayName)
    expect(names).toEqual([...names].sort((a, b) => b.localeCompare(a)))
  })

  it('sortDeckCandidateIds preserves all ids', () => {
    const ids = getDeckCandidates(DEFAULT_COLLECTION_SORT)
    expect(sortDeckCandidateIds(ids, { mode: 'name', direction: 'asc' }).length).toBe(ids.length)
    expect(new Set(sortDeckCandidateIds(ids, { mode: 'elixir', direction: 'desc' })).size).toBe(ids.length)
  })
})
