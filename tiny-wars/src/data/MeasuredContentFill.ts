/**
 * Alpha-trim fill (trimmedHeight / frameHeight) on idle frame 0.
 * Drives on-map sprite scale via {@link targetHeightForCard} — lower fill = larger display.
 * Re-measure with: npm run measure:content-fill
 */
export const MEASURED_CONTENT_FILL = {
  warrior:          0.46,
  archer:           0.39,
  elite_archer:     0.46,
  lancer:           0.47,
  skeleton:         0.38,
  skeleton_army:    0.38,
  troll:            0.55,
  spear_goblin:     0.49,
  villagers:        0.37,
  torch_goblin:     0.35,
  wizard:           0.43,
  lizard:           0.66,
  air_boat:         0.94,
  mega_minion:      0.36,
  pig_rider:        0.57,
  pig:              0.27,
  bomb_fish:        0.35,
  goblin_demolisher: 0.35,
  minotaur:         0.40,
  gnoll:            0.39,
  thief:            0.38,
  turtle:           0.28,
  panda:            0.37,
  monk:             0.36,
  harpoon_shark:    0.41,
  spider:           0.44,
  spiderling:       0.44,
  wood_tower:       0.74,
  goblin_barrel:    0.85,
  tnt:              0.35,
  arrows:           0.37,
} as const satisfies Record<string, number>
