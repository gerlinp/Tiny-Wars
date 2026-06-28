import { CARD_DEFINITIONS, DEFAULT_DECK } from '@data/CardData'

const STORAGE_KEY = 'tinywars.playerDeck'
const COLLECTION_SORT_KEY = 'tinywars.collectionSort'

/** Cards a match deck must contain — matches the bot's deck size for fair play. */
export const DECK_SIZE = 8

export type CollectionSortMode = 'recent' | 'elixir' | 'name'
export type CollectionSortDirection = 'asc' | 'desc'

export interface CollectionSortState {
  mode: CollectionSortMode
  direction: CollectionSortDirection
}

export const COLLECTION_SORT_MODES: readonly CollectionSortMode[] = ['recent', 'elixir', 'name']

export const COLLECTION_SORT_LABELS: Record<CollectionSortMode, string> = {
  recent: 'Recent',
  elixir: 'Elixir',
  name: 'Name',
}

export const DEFAULT_COLLECTION_SORT: CollectionSortState = {
  mode: 'recent',
  direction: 'desc',
}

/** Default direction when first selecting a sort mode. */
export function defaultSortDirection(mode: CollectionSortMode): CollectionSortDirection {
  return mode === 'recent' ? 'desc' : 'asc'
}

export function sortDirectionArrow(direction: CollectionSortDirection): string {
  return direction === 'asc' ? '↑' : '↓'
}

export function collectionSortLabel(state: CollectionSortState, active: boolean): string {
  const base = COLLECTION_SORT_LABELS[state.mode]
  return active ? `${base} ${sortDirectionArrow(state.direction)}` : base
}

/** Every card id offered in the deck builder collection. */
export function getAllDeckCandidateIds(): string[] {
  return Object.keys(CARD_DEFINITIONS)
}

function compareDeckCandidates(a: string, b: string, mode: CollectionSortMode): number {
  switch (mode) {
    case 'recent':
      return (CARD_DEFINITIONS[a]?.addedAt ?? 0) - (CARD_DEFINITIONS[b]?.addedAt ?? 0)
        || a.localeCompare(b)
    case 'elixir': {
      const defA = CARD_DEFINITIONS[a]
      const defB = CARD_DEFINITIONS[b]
      if (!defA || !defB) return 0
      return defA.elixirCost - defB.elixirCost
        || defA.displayName.localeCompare(defB.displayName)
    }
    case 'name': {
      const defA = CARD_DEFINITIONS[a]
      const defB = CARD_DEFINITIONS[b]
      if (!defA || !defB) return 0
      return defA.displayName.localeCompare(defB.displayName)
    }
  }
}

export function sortDeckCandidateIds(
  ids: readonly string[],
  sort: CollectionSortState,
): string[] {
  const factor = sort.direction === 'asc' ? 1 : -1
  return [...ids].sort((a, b) => factor * compareDeckCandidates(a, b, sort.mode))
}

/** Every card the deck builder offers in the chosen sort order. */
export function getDeckCandidates(sort: CollectionSortState = DEFAULT_COLLECTION_SORT): string[] {
  return sortDeckCandidateIds(getAllDeckCandidateIds(), sort)
}

export function loadCollectionSort(): CollectionSortState {
  try {
    const raw = globalThis.localStorage?.getItem(COLLECTION_SORT_KEY)
    if (!raw) return { ...DEFAULT_COLLECTION_SORT }

    try {
      const parsed: unknown = JSON.parse(raw)
      if (isCollectionSortState(parsed)) return parsed
    } catch {
      /* legacy plain-string value */
    }

    if (raw === 'recent' || raw === 'elixir' || raw === 'name') {
      return { mode: raw, direction: defaultSortDirection(raw) }
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_COLLECTION_SORT }
}

export function saveCollectionSort(sort: CollectionSortState): void {
  try {
    globalThis.localStorage?.setItem(COLLECTION_SORT_KEY, JSON.stringify(sort))
  } catch {
    /* storage unavailable */
  }
}

function isCollectionSortState(value: unknown): value is CollectionSortState {
  if (!value || typeof value !== 'object') return false
  const sort = value as CollectionSortState
  return (sort.mode === 'recent' || sort.mode === 'elixir' || sort.mode === 'name')
    && (sort.direction === 'asc' || sort.direction === 'desc')
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
