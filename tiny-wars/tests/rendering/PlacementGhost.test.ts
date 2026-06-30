import { describe, expect, it, vi } from 'vitest'

vi.mock('phaser', () => ({ default: {} }))

vi.mock('@rendering/renderingUtils', () => ({
  resolveTexture: (_scene: unknown, key: string) => key,
}))

vi.mock('@rendering/assetDisplaySize', () => ({
  applyCardDisplaySize: vi.fn(),
  buildingPlacementCombatRadiusPx: () => 40,
}))

vi.mock('@rendering/AnimationRegistry', () => ({
  playCardAnim: vi.fn(),
}))

import { CardType } from '@core/types'
import type { CardDefinition } from '@core/types'
import { PlacementGhost } from '@rendering/PlacementGhost'

function mockSprite() {
  let originX = 0.5
  let originY = 0.5
  const chain = {
    anims: { stop: vi.fn() },
    setOrigin(x: number, y: number) {
      originX = x
      originY = y
      return chain
    },
    get origin() {
      return { x: originX, y: originY }
    },
    setTexture: vi.fn(() => chain),
    setDisplaySize: vi.fn(() => chain),
    setAlpha: vi.fn(() => chain),
    setDepth: vi.fn(() => chain),
    setScale: vi.fn(() => chain),
    setVisible: vi.fn(() => chain),
    setPosition: vi.fn(() => chain),
    setTint: vi.fn(() => chain),
    clearTint: vi.fn(() => chain),
    scaleX: 1,
    scaleY: 1,
  }
  return chain
}

function mockScene(sprite = mockSprite()) {
  return {
    add: {
      sprite: vi.fn(() => sprite),
      circle: vi.fn(() => ({
        setStrokeStyle: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        setVisible: vi.fn().mockReturnThis(),
        setRadius: vi.fn().mockReturnThis(),
        setPosition: vi.fn().mockReturnThis(),
        setFillStyle: vi.fn().mockReturnThis(),
      })),
    },
    textures: { exists: vi.fn(() => true) },
  } as unknown as Phaser.Scene
}

const WOOD_TOWER: CardDefinition = {
  id: 'wood_tower',
  displayName: 'Bomb Tower',
  description: 'test',
  addedAt: 0,
  elixirCost: 4,
  cardType: CardType.BUILDING,
  textureKeyPlayer: 'wood_tower_blue_sheet',
  textureKeyBot: 'wood_tower_red_sheet',
  stats: {} as CardDefinition['stats'],
}

const WARRIOR: CardDefinition = {
  id: 'warrior',
  displayName: 'Warrior',
  description: 'test',
  addedAt: 0,
  elixirCost: 3,
  cardType: CardType.TROOP,
  textureKeyPlayer: 'warrior_blue_sheet',
  textureKeyBot: 'warrior_red_sheet',
  deployCount: 1,
  stats: {} as CardDefinition['stats'],
}

describe('PlacementGhost', () => {
  it('resets troop origin after a building preview (bomb tower feet anchor)', () => {
    const sprite = mockSprite()
    const scene = mockScene(sprite)
    const ghost = new PlacementGhost(scene)

    ghost.setCard(WOOD_TOWER)
    expect(sprite.origin.y).toBe(1)

    ghost.setCard(WARRIOR)
    expect(sprite.origin.x).toBe(0.5)
    expect(sprite.origin.y).toBe(0.5)
  })
})
