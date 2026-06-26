import { CARD_DEFINITIONS, DEFAULT_DECK } from '@data/CardData'

const STORAGE_KEY = 'tinywars.playerDeck'

/** Cards a match deck must contain — matches the bot's deck size for fair play. */
export const DECK_SIZE = 8

/**
 * Every card the deck builder offers, ordered by elixir cost then name.
 * Sourced from {@link CARD_DEFINITIONS} so new cards appear automatically.
 */
export function getDeckCandidates(): string[] {
  return Object.values(CARD_DEFINITIONS)
    .slice()
    .sort((a, b) => a.elixirCost - b.elixirCost || a.displayName.localeCompare(b.displayName))
    .map(c => c.id)
}

/** Load the saved player deck, falling back to {@link DEFAULT_DECK} when missing or invalid. */
export function loadPlayerDeck(): string[] {
  const raw = readStorage(STORAGE_KEY)
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (isValidDeck(parsed)) return parsed
    } catch {
      /* corrupt value — fall through to default */
    }
  }
  return [...DEFAULT_DECK]
}

export function savePlayerDeck(deckIds: string[]): void {
  writeStorage(STORAGE_KEY, JSON.stringify(deckIds))
}

function isValidDeck(ids: unknown): ids is string[] {
  return Array.isArray(ids)
    && ids.length === DECK_SIZE
    && new Set(ids).size === ids.length
    && ids.every(id => typeof id === 'string' && CARD_DEFINITIONS[id] !== undefined)
}

function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value)
  } catch {
    /* storage unavailable (private mode / SSR) — deck just won't persist */
  }
}
