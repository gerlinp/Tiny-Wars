/** Editor-only labels that differ from {@link CardDefinition.displayName}. */
export const MAP_EDITOR_DISPLAY_NAME_OVERRIDES: Readonly<Record<string, string>> = {
  archer: 'Archers',
  skeleton: 'Skeletons',
  wood_tower: 'Bomb Tower',
}

/** Per-card fields not inferrable from CardData + AssetManifest alone. */
export const MAP_EDITOR_UNIT_OVERRIDES: Readonly<Record<string, Record<string, unknown>>> = {
  air_boat: { spriteOriginY: 0.25 },
  wood_tower: { spriteOriginY: 1, hbarOffsetY: -1.1 },
}

/** Stable picker order; new game cards not listed here are appended with a sync warning. */
export const MAP_EDITOR_CATALOG_ORDER: readonly string[] = [
  'warrior', 'archer', 'elite_archer', 'lancer', 'skeleton', 'skeleton_army', 'troll',
  'spear_goblin', 'villagers', 'torch_goblin', 'fire_wizard', 'wizard', 'elder_shaman', 'lightning_shaman', 'voodoo_shaman', 'lizard', 'air_boat',
  'bear', 'pig_rider', 'pig', 'bomb_fish', 'goblin_demolisher', 'minotaur',
  'gnoll', 'thief', 'turtle', 'panda', 'monk', 'harpoon_shark', 'spider', 'spiderling', 'miner',
  'wood_tower', 'princess_tower', 'king_tower',
]

export const MAP_EDITOR_TOWER_PATHS = {
  player: {
    princess: 'assets/Factions/Knights/Buildings/Tower/Tower_Blue.png',
    king: 'assets/Factions/Knights/Buildings/Castle/Castle_Blue.png',
  },
  bot: {
    princess: 'assets/Factions/Knights/Buildings/Tower/Tower_Red.png',
    king: 'assets/Factions/Knights/Buildings/Castle/Castle_Red.png',
  },
} as const

export const MAP_EDITOR_TOWER_ENTRIES = [
  {
    id: 'princess_tower',
    name: 'Princess Tower',
    attackRange: 7.5,
    fw: 128,
    fh: 256,
    pathRef: 'TOWER_EDITOR_PATHS.bot.princess',
    contentFill: 0.90,
    isTower: true,
    isKing: false,
    slotOffsetX: 0,
    slotOffsetY: 0,
  },
  {
    id: 'king_tower',
    name: 'King Tower',
    attackRange: 20,
    fw: 320,
    fh: 256,
    pathRef: 'TOWER_EDITOR_PATHS.bot.king',
    contentFill: 0.88,
    isTower: true,
    isKing: true,
    slotOffsetX: 0,
    slotOffsetY: 0,
  },
] as const
