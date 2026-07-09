/** Solo-mode bot difficulty tiers. */
export type BotDifficulty = 'EASY' | 'NORMAL' | 'HARD'

export const BOT_DIFFICULTIES: readonly BotDifficulty[] = ['EASY', 'NORMAL', 'HARD']

export const BOT_DIFFICULTY_LABELS: Record<BotDifficulty, string> = {
  EASY: 'Easy',
  NORMAL: 'Normal',
  HARD: 'Hard',
}

/**
 * Per-difficulty bot decks (DECK_SIZE cards each, like the player).
 * EASY runs cheap simple troops with no spells; NORMAL mirrors the default
 * starter deck plus a win condition; HARD gets a tank + splash-support +
 * spell toolkit so its smarter play has the cards to back it up.
 */
export const BOT_DECKS: Record<BotDifficulty, string[]> = {
  EASY: [
    'miner', 'skeleton', 'turtle', 'spear_goblin',
    'warrior', 'archer', 'thief', 'harpoon_shark',
  ],
  NORMAL: [
    'warrior', 'archer', 'skeleton', 'lancer',
    'torch_goblin', 'harpoon_shark', 'arrows', 'pig_rider',
  ],
  HARD: [
    'bear', 'torch_goblin', 'elite_archer', 'snake',
    'pig_rider', 'skeleton_army', 'arrows', 'skeleton',
  ],
}

const STORAGE_KEY = 'tinywars.botDifficulty'

export function loadBotDifficulty(): BotDifficulty {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && (BOT_DIFFICULTIES as readonly string[]).includes(saved)) {
      return saved as BotDifficulty
    }
  } catch { /* private browsing / SSR — fall through to default */ }
  return 'NORMAL'
}

export function saveBotDifficulty(difficulty: BotDifficulty): void {
  try {
    localStorage.setItem(STORAGE_KEY, difficulty)
  } catch { /* ignore storage failures */ }
}
