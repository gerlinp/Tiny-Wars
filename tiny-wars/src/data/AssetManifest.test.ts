import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { CARD_ASSET_BUNDLES, AVATAR_BACKDROP_BANNER, HEX_SHAMAN_EXPLOSION_SHEET, HEX_SHAMAN_PROJECTILE_SHEET, cardAvatarKey, getCardAvatarBackdrop, getCardAvatarDef } from './AssetManifest'
import { DEFAULT_DECK } from './CardData'

const PUBLIC = resolve(import.meta.dirname, '../../public')

describe('Card avatars', () => {
  it('every default deck card has its own avatar file on disk', () => {
    const keys = new Set<string>()
    for (const id of DEFAULT_DECK) {
      const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === id)
      expect(bundle?.avatar, `${id} missing avatar mapping`).toBeDefined()

      const key = cardAvatarKey(id)
      expect(keys.has(key), `${id} shares avatar key ${key}`).toBe(false)
      keys.add(key)

      const filePath = resolve(PUBLIC, bundle!.avatar!.path)
      expect(existsSync(filePath), filePath).toBe(true)
    }
  })

  it('every card bundle declares a dedicated avatar', () => {
    for (const bundle of CARD_ASSET_BUNDLES) {
      expect(bundle.avatar, bundle.cardId).toBeDefined()
      expect(bundle.avatar.key.length).toBeGreaterThan(0)
      expect(bundle.avatar.path.length).toBeGreaterThan(0)
    }
  })

  it('throws when a card has no avatar instead of falling back', () => {
    expect(() => getCardAvatarDef('not_a_card')).toThrow(/unknown card/i)
    expect(() => cardAvatarKey('not_a_card')).toThrow()
  })

  it('pawn uses its dedicated human avatar, not the unit spritesheet', () => {
    expect(cardAvatarKey('pawn')).toBe('avatar_avatars_05')
    expect(cardAvatarKey('pawn')).not.toBe('pawn_blue_idle')
  })

  it('torch goblin uses Enemy Pack sprite sheets with correct frame counts', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'torch_goblin')!
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Goblin Raiders/Torch Goblin/Torch Goblin_Idle.png')
      expect(side.run.sheet.path).toContain('Torch Goblin_Run.png')
      expect(side.attack.sheet.path).toContain('Torch Goblin_Attack.png')
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(8)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(6)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(8)
    expect(bundle.tintBotSide).toBe(true)
  })

  it('wizard uses Hex Shaman sheets and tints the bot side', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'wizard')!
    expect(cardAvatarKey('wizard')).toBe('avatar_hex_shaman')
    expect(bundle.player.idle.sheet.path).toContain('Hex Shaman_Idle.png')
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(10)
    expect(bundle.tintBotSide).toBe(true)
    expect(existsSync(resolve(PUBLIC, HEX_SHAMAN_PROJECTILE_SHEET.path))).toBe(true)
    expect(existsSync(resolve(PUBLIC, HEX_SHAMAN_EXPLOSION_SHEET.path))).toBe(true)
  })

  it('tnt uses the bomb idle sprite for the card hand, not a fish avatar', () => {
    expect(cardAvatarKey('tnt')).toBe('avatar_bomb_idle')
    expect(getCardAvatarDef('tnt').path).toContain('Bomb_Idle.png')
  })

  it('tnt layers bomb idle on the banner slot backdrop', () => {
    const backdrop = getCardAvatarBackdrop('tnt')
    expect(backdrop).toEqual(AVATAR_BACKDROP_BANNER)
    expect(existsSync(resolve(PUBLIC, backdrop!.path))).toBe(true)
  })

  it('arrows uses the archer arrow sprite for the card hand', () => {
    expect(cardAvatarKey('arrows')).toBe('arrow_blue')
    expect(getCardAvatarDef('arrows').path).toContain('Archer/Arrow.png')
  })

  it('warrior knight avatar is scaled down slightly in the hand', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'warrior')!
    expect(bundle.avatarHandScale).toBeGreaterThan(0.8)
    expect(bundle.avatarHandScale).toBeLessThan(1)
  })

  it('bomb tower uses the wood tower building sprite in the card hand', () => {
    expect(cardAvatarKey('wood_tower')).toBe('avatar_bomb_tower')
    const def = getCardAvatarDef('wood_tower')
    expect(def.path).toContain('Wood_Tower_Blue.png')
    expect(def.frameWidth).toBe(205)
    expect(getCardAvatarBackdrop('wood_tower')).toBeNull()
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'wood_tower')!
    expect(bundle.avatarBuildingFit).toBe(true)
  })
})
