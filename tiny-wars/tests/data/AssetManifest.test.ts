import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { CARD_ASSET_BUNDLES, AVATAR_CROP_RATIO_DEFAULT, EXPLOSION_SHEET, GARRISON_CANNON_BALL, GNOLL_BONE_SHEET, GOBLIN_DYNAMITE_SHEET, HARPOON_PROJECTILE_SHEET, HEX_SHAMAN_EXPLOSION_SHEET, HEX_SHAMAN_PROJECTILE_SHEET, cardAvatarKey, getCardAvatarBackdrop, getCardAvatarCropRatio, getCardAvatarDef, getCardAvatarSwarmSource, getUseEditorCompositeAvatar, resolveAttackAnimKey } from '@data/AssetManifest'
import { DEFAULT_DECK, CARD_DEFINITIONS } from '@data/CardData'
import { Owner } from '@core/types'

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

  it('fire goblin uses Enemy Pack sprite sheets with correct frame counts', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'fire_goblin')!
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

  it('pig_shaman uses Hex Shaman sheets and tints the bot side', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'pig_shaman')!
    expect(cardAvatarKey('pig_shaman')).toBe('avatar_hex_shaman')
    expect(bundle.player.idle.sheet.path).toContain('Hex Shaman_Idle.png')
    expect(bundle.tintBotSide).toBe(true)
    expect(existsSync(resolve(PUBLIC, HEX_SHAMAN_PROJECTILE_SHEET.path))).toBe(true)
    expect(existsSync(resolve(PUBLIC, HEX_SHAMAN_EXPLOSION_SHEET.path))).toBe(true)
  })

  it('big_bomb uses the bomb idle sprite for the card hand, not a fish avatar', () => {
    expect(cardAvatarKey('big_bomb')).toBe('avatar_bomb_idle')
    expect(getCardAvatarDef('big_bomb').path).toContain('Bomb_Idle.png')
  })

  it('big_bomb shows the bare bomb icon with no banner backdrop', () => {
    expect(getCardAvatarBackdrop('big_bomb')).toBeNull()
  })

  it('arrows uses the archer arrow sprite for the card hand', () => {
    expect(cardAvatarKey('arrows')).toBe('arrow_blue')
    expect(getCardAvatarDef('arrows').path).toContain('Archer/Arrow.png')
  })

  it('knights archer uses faction combined sheets with directional shoot clips', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'archer')!
    expect(cardAvatarKey('archer')).toBe('avatar_knights_archer')
    expect(getCardAvatarDef('archer').path).toContain('Archer_Blue_(NoArms).png')
    expect(getCardAvatarDef('archer').frame).toBe(0)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Factions/Knights/Troops/Archer/')
      expect(side.idle.sheet.path).toMatch(/Archer_(Blue|Red)\.png$/)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(6)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(6)
    expect(bundle.player.idle.start).toBe(0)
    expect(bundle.player.run.start).toBe(0)
    expect(bundle.player.attack.start).toBe(24)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(8)
    expect(bundle.player.attackDownRight!.start).toBe(32)
    expect(bundle.player.attackDown!.start).toBe(40)
    expect(bundle.player.attackDownLeft!.start).toBe(48)
    expect(bundle.attackHitFrame).toBe(27)
  })

  it('knights archer picks shoot clips from aim direction', () => {
    expect(resolveAttackAnimKey('archer', Owner.PLAYER, 100, 200, 100, 100))
      .toEqual({ key: 'archer_blue_attack', flipX: false })
    expect(resolveAttackAnimKey('archer', Owner.PLAYER, 100, 200, 100, 300))
      .toEqual({ key: 'archer_blue_attack_down', flipX: false })
    expect(resolveAttackAnimKey('archer', Owner.PLAYER, 100, 200, 160, 280))
      .toEqual({ key: 'archer_blue_attack_down_right', flipX: false })
    expect(resolveAttackAnimKey('archer', Owner.PLAYER, 100, 200, 40, 280))
      .toEqual({ key: 'archer_blue_attack_down_left', flipX: false })
    expect(resolveAttackAnimKey('archer', Owner.PLAYER, 100, 200, 160, 205))
      .toEqual({ key: 'archer_blue_attack', flipX: false })
    expect(resolveAttackAnimKey('archer', Owner.PLAYER, 100, 200, 40, 205))
      .toEqual({ key: 'archer_blue_attack', flipX: true })
  })

  it('skeleton uses Skull sheets, tints bot side, and dedicated enemy avatar', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'skeleton')!
    expect(cardAvatarKey('skeleton')).toBe('avatar_enemy_avatars_01')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('skeleton').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Enemies/Skull/Skull_Idle.png')
      expect(side.run.sheet.path).toContain('Skull_Run.png')
      expect(side.attack.sheet.path).toContain('Skull_Attack.png')
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(8)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(6)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(7)
    expect(bundle.tintBotSide).toBe(true)
    expect(bundle.attackHitFrame).toBe(4)
  })

  it('skeleton army uses clustered swarm portrait from skeleton idle art', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'skeleton_army')!
    expect(cardAvatarKey('skeleton_army')).toBe('avatar_skeleton_army')
    expect(getCardAvatarDef('skeleton_army').path).toContain('Skull_Idle.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('skeleton_army').path))).toBe(true)
    expect(getCardAvatarBackdrop('skeleton_army')).toBeNull()
    expect(bundle.avatarSwarmSourceCardId).toBe('skeleton')
    expect(getCardAvatarSwarmSource('skeleton_army')).toBe('skeleton')
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Enemies/Skull/Skull_Idle.png')
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
    }
    expect(bundle.tintBotSide).toBe(true)
  })

  it('spear goblins uses enemy Spear Goblin sheets with dedicated avatar', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'spear_goblin')!
    expect(cardAvatarKey('spear_goblin')).toBe('avatar_spear_goblin')
    expect(getCardAvatarDef('spear_goblin').path).toContain('Spear Goblin.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('spear_goblin').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Spear Goblin/Spear Goblin_Idle.png')
      expect(side.run.sheet.path).toContain('Spear Goblin_Run.png')
      expect(side.attack.sheet.path).toContain('Spear Goblin_Attack Strong.png')
      expect(side.idle.sheet.frameWidth).toBe(256)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(8)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(6)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(8)
    expect(bundle.tintBotSide).toBe(true)
    expect(bundle.attackHitFrame).toBe(4)
  })

  it('villagers uses hooded villager sheets with dedicated avatar', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'villagers')!
    expect(cardAvatarKey('villagers')).toBe('avatar_villagers')
    expect(getCardAvatarDef('villagers').path).toContain('Avatars_05.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('villagers').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Pawn_Idle.png')
      expect(side.run.sheet.path).toContain('Pawn_Run.png')
      expect(side.attack.sheet.path).toContain('Pawn_Interact Knife.png')
      expect(side.idle.sheet.frameWidth).toBe(192)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(8)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(6)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(4)
    expect(bundle.tintBotSide).toBeFalsy()
    expect(bundle.attackHitFrame).toBe(2)
  })

  it('harpoon shark uses pirate fish sheets, harpoon projectile, and dedicated avatar', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'harpoon_shark')!
    expect(cardAvatarKey('harpoon_shark')).toBe('avatar_harpoon_shark')
    expect(getCardAvatarDef('harpoon_shark').path).toContain('Harpoon Shark.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('harpoon_shark').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Harpoon Shark_Idle.png')
      expect(side.run.sheet.path).toContain('Harpoon Shark_Run.png')
      expect(side.attack.sheet.path).toContain('Harpoon Shark_Throw.png')
      expect(side.idle.sheet.frameWidth).toBe(192)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(existsSync(resolve(PUBLIC, HARPOON_PROJECTILE_SHEET.path))).toBe(true)
    expect(bundle.tintBotSide).toBe(true)
    expect(bundle.attackHitFrame).toBe(4)
  })

  it('king tower projectile uses Cannon_Ball.png from the garrison cannon folder', () => {
    expect(GARRISON_CANNON_BALL.key).toBe('garrison_cannon_ball')
    expect(GARRISON_CANNON_BALL.path).toContain('Cannon/Cannon_Ball.png')
    expect(existsSync(resolve(PUBLIC, GARRISON_CANNON_BALL.path))).toBe(true)
  })

  it('troll uses 384×384 Troll sheets with dedicated enemy avatar', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'troll')!
    expect(cardAvatarKey('troll')).toBe('avatar_enemy_avatars_16')
    expect(getCardAvatarDef('troll').path).toContain('Enemy Avatars_16.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('troll').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Enemies/Troll/Troll_Idle.png')
      expect(side.run.sheet.path).toContain('Troll_Walk.png')
      expect(side.attack.sheet.path).toContain('Troll_Attack.png')
      expect(side.idle.sheet.frameWidth).toBe(384)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(12)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(10)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(6)
    expect(bundle.tintBotSide).toBe(true)
    expect(bundle.attackHitFrame).toBe(4)
  })

  it('lancer uses 320×320 Lancer sheets with correct frame counts', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'lancer')!
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Lancer/Lancer_Idle.png')
      expect(side.run.sheet.path).toContain('Lancer/Lancer_Run.png')
      expect(side.attack.sheet.path).toContain('Lancer/Lancer_Right_Attack.png')
      expect(side.attackUp!.sheet.path).toContain('Lancer/Lancer_Up_Attack.png')
      expect(side.attackDown!.sheet.path).toContain('Lancer/Lancer_Down_Attack.png')
      expect(side.idle.sheet.frameWidth).toBe(320)
      expect(side.idle.sheet.frameHeight).toBe(320)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attackUp!.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attackDown!.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(12)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(6)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(3)
    expect(cardAvatarKey('lancer')).toBe('avatar_avatars_02')
    expect(cardAvatarKey('lancer')).not.toBe('avatar_avatars_07')
    expect(bundle.attackHitFrame).toBe(2)
  })

  it('lancer picks up/down/right attack clips from aim direction', () => {
    expect(resolveAttackAnimKey('lancer', Owner.PLAYER, 100, 200, 100, 100))
      .toEqual({ key: 'lancer_blue_attack_up', flipX: false })
    expect(resolveAttackAnimKey('lancer', Owner.PLAYER, 100, 200, 100, 300))
      .toEqual({ key: 'lancer_blue_attack_down', flipX: false })
    expect(resolveAttackAnimKey('lancer', Owner.PLAYER, 100, 200, 160, 205))
      .toEqual({ key: 'lancer_blue_attack', flipX: false })
    expect(resolveAttackAnimKey('lancer', Owner.PLAYER, 100, 200, 40, 205))
      .toEqual({ key: 'lancer_blue_attack', flipX: true })
  })

  it('warrior knight avatar is scaled down slightly in the hand', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'warrior')!
    expect(bundle.avatarHandScale).toBeGreaterThan(0.8)
    expect(bundle.avatarHandScale).toBeLessThan(1)
  })

  it('unit sprites that fill the frame use a looser hand crop', () => {
    for (const id of ['fire_goblin', 'pig_shaman'] as const) {
      const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === id)!
      expect(bundle.avatarCropRatio).toBeGreaterThan(AVATAR_CROP_RATIO_DEFAULT)
    }
    expect(getCardAvatarCropRatio('warrior')).toBe(AVATAR_CROP_RATIO_DEFAULT)
  })

  it('lizard uses Lizard sheets with bot-side tint and idle portrait', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'lizard')!
    expect(cardAvatarKey('lizard')).toBe('avatar_enemy_avatars_13')
    expect(getCardAvatarDef('lizard').path).toContain('Enemy Avatars_13.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('lizard').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Caveborn/Lizard/Lizard_Idle_Flying.png')
      expect(side.run.sheet.path).toContain('Caveborn/Lizard/Flying_Lizard_Run.png')
      expect(side.attack.sheet.path).toContain('Flying_Lizard_Attack.png')
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(7)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(6)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(9)
    expect(bundle.tintBotSide).toBe(true)
    expect(bundle.attackHitFrame).toBe(5)
  })

  it('bear uses native 256×256 Bear sheets with idle portrait (Mega Knight rules)', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'bear')!
    expect(CARD_DEFINITIONS.bear!.displayName).toBe('Bear')
    expect(cardAvatarKey('bear')).toBe('avatar_enemy_avatars_14')
    expect(getCardAvatarDef('bear').path).toContain('Enemy Avatars_14.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('bear').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Caveborn/Bear/Bear_Idle.png')
      expect(side.run.sheet.path).toContain('Bear_Run.png')
      expect(side.attack.sheet.path).toContain('Bear_Attack.png')
      expect(side.idle.sheet.frameWidth).toBe(256)
      expect(side.idle.sheet.frameHeight).toBe(256)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(8)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(5)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(9)
    expect(bundle.tintBotSide).toBe(true)
    expect(bundle.attackHitFrame).toBe(4)
  })

  it('pig rider uses Pig Rider sheets with dedicated enemy avatar', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'pig_rider')!
    expect(cardAvatarKey('pig_rider')).toBe('avatar_pig_rider')
    expect(getCardAvatarDef('pig_rider').path).toContain('Pig Rider.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('pig_rider').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Pig Rider Spear Goblin/Pig Rider_Idle.png')
      expect(side.run.sheet.path).toContain('Pig Rider_Run.png')
      expect(side.attack.sheet.path).toContain('Pig Rider_Attack.png')
      expect(side.idle.sheet.frameWidth).toBe(256)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(8)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(4)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(7)
    expect(bundle.tintBotSide).toBe(true)
    expect(bundle.attackHitFrame).toBe(4)
  })

  it('pig uses native 192×192 Pig sheets with idle portrait', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'pig')!
    expect(cardAvatarKey('pig')).toBe('avatar_pig')
    expect(getCardAvatarDef('pig').path).toContain('Goblin Raiders/Pig/Pig_Idle.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('pig').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Pig/Pig_Idle.png')
      expect(side.run.sheet.path).toContain('Pig_Run.png')
      expect(side.attack.sheet.path).toContain('Pig_Run.png')
      expect(side.idle.sheet.frameWidth).toBe(192)
      expect(side.idle.sheet.frameHeight).toBe(192)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(10)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(4)
    expect(bundle.tintBotSide).toBe(true)
    expect(bundle.attackHitFrame).toBe(2)
  })

  it('bomb fish uses Bomb Fish sheets with dedicated enemy avatar', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'bomb_fish')!
    expect(cardAvatarKey('bomb_fish')).toBe('avatar_bomb_fish')
    expect(getCardAvatarDef('bomb_fish').path).toContain('Bomb Fish.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('bomb_fish').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Bomb Fish/Bomb Fish_Idle.png')
      expect(side.run.sheet.path).toContain('Bomb Fish_Run.png')
      expect(side.attack.sheet.path).toContain('Bomb Fish_Shoot.png')
      expect(side.idle.sheet.frameWidth).toBe(192)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(8)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(6)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(7)
    expect(bundle.tintBotSide).toBe(true)
    expect(bundle.attackHitFrame).toBe(4)
  })

  it('minotaur uses Minotaur sheets with dedicated enemy avatar', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'minotaur')!
    expect(cardAvatarKey('minotaur')).toBe('avatar_enemy_avatars_09')
    expect(getCardAvatarDef('minotaur').path).toContain('Enemy Avatars_09.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('minotaur').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Enemies/Minotaur/Minotaur_Idle.png')
      expect(side.run.sheet.path).toContain('Minotaur_Walk.png')
      expect(side.attack.sheet.path).toContain('Minotaur_Attack.png')
      expect(side.idle.sheet.frameWidth).toBe(320)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(16)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(8)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(12)
    expect(bundle.tintBotSide).toBe(true)
    expect(bundle.attackHitFrame).toBe(5)
  })

  it('gnoll uses Gnoll sheets, bone projectile, and Enemy Avatars_10 portrait', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'gnoll')!
    expect(cardAvatarKey('gnoll')).toBe('avatar_enemy_avatars_10')
    expect(getCardAvatarDef('gnoll').path).toContain('Enemy Avatars_10.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('gnoll').path))).toBe(true)
    expect(existsSync(resolve(PUBLIC, GNOLL_BONE_SHEET.path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Enemies/Gnoll/Gnoll_Idle.png')
      expect(side.run.sheet.path).toContain('Gnoll_Walk.png')
      expect(side.attack.sheet.path).toContain('Gnoll_Throw.png')
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(6)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(8)
    expect(bundle.tintBotSide).toBe(true)
    expect(bundle.attackHitFrame).toBe(4)
  })

  it('thief uses Thief sheets with Enemy Avatars_06 portrait', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'thief')!
    expect(cardAvatarKey('thief')).toBe('avatar_enemy_avatars_06')
    expect(getCardAvatarDef('thief').path).toContain('Enemy Avatars_06.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('thief').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Enemies/Thief/Thief_Idle.png')
      expect(side.run.sheet.path).toContain('Thief_Run.png')
      expect(side.attack.sheet.path).toContain('Thief_Attack.png')
      expect(side.idle.sheet.frameWidth).toBe(192)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(6)
    expect(bundle.tintBotSide).toBe(true)
  })

  it('turtle uses Turtle sheets with dedicated enemy avatar', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'turtle')!
    expect(cardAvatarKey('turtle')).toBe('avatar_enemy_avatars_08')
    expect(getCardAvatarDef('turtle').path).toContain('Enemy Avatars_08.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('turtle').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Caveborn/Turtle/Turtle_Idle.png')
      expect(side.run.sheet.path).toContain('Turtle_Walk.png')
      expect(side.attack.sheet.path).toContain('Turtle_Attack.png')
      expect(side.idle.sheet.frameWidth).toBe(320)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(10)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(7)
    expect(bundle.tintBotSide).toBe(true)
  })

  it('panda uses Panda sheets with dedicated enemy avatar', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'panda')!
    expect(bundle.contentFill).toBe(0.37)
    expect(cardAvatarKey('panda')).toBe('avatar_enemy_avatars_12')
    expect(getCardAvatarDef('panda').path).toContain('Enemy Avatars_12.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('panda').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Enemies/Panda/Panda_Idle.png')
      expect(side.run.sheet.path).toContain('Panda_Run.png')
      expect(side.attack.sheet.path).toContain('Panda_Attack.png')
      expect(side.idle.sheet.frameWidth).toBe(256)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(10)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(6)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(13)
    expect(bundle.tintBotSide).toBe(true)
    expect(bundle.attackHitFrame).toBe(6)
  })

  it('monk uses Monk sheets with dedicated human avatar and heal effect assets', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'monk')!
    expect(cardAvatarKey('monk')).toBe('avatar_avatars_04')
    expect(getCardAvatarDef('monk').path).toContain('Avatars_04.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('monk').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('/Monk/Idle.png')
      expect(side.run.sheet.path).toContain('/Monk/Run.png')
      expect(side.attack.sheet.path).toContain('/Monk/Heal.png')
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(6)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(4)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(11)
    expect(bundle.tintBotSide).toBeUndefined()
    expect(existsSync(resolve(PUBLIC, 'assets/Units/Blue Units/Monk/Heal_Effect.png'))).toBe(true)
    expect(existsSync(resolve(PUBLIC, 'assets/Units/Red Units/Monk/Heal_Effect.png'))).toBe(true)
  })

  it('spider uses Caveborn Spider sheets and Enemy Avatars_11 portrait', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'spider')!
    expect(cardAvatarKey('spider')).toBe('avatar_enemy_avatars_11')
    expect(getCardAvatarDef('spider').path).toContain('Enemy Avatars_11.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('spider').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Caveborn/Spider/Spider_Idle.png')
      expect(side.run.sheet.path).toContain('Spider_Run.png')
      expect(side.attack.sheet.path).toContain('Spider_Attack.png')
      expect(side.idle.sheet.frameWidth).toBe(192)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.run.sheet.path))).toBe(true)
      expect(existsSync(resolve(PUBLIC, side.attack.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.end - bundle.player.idle.start + 1).toBe(8)
    expect(bundle.player.run.end - bundle.player.run.start + 1).toBe(5)
    expect(bundle.player.attack.end - bundle.player.attack.start + 1).toBe(8)
    expect(bundle.tintBotSide).toBe(true)
    expect(bundle.attackHitFrame).toBe(4)
  })

  it('bomb tower card portrait uses the pirate platform art path', () => {
    expect(cardAvatarKey('wood_tower')).toBe('avatar_bomb_tower')
    const def = getCardAvatarDef('wood_tower')
    expect(def.path).toContain('Pirate Tower_Ground.png')
    expect(def.frameWidth).toBe(128)
    expect(getCardAvatarBackdrop('wood_tower')).toBeNull()
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'wood_tower')!
    expect(bundle.avatarBuildingFit).toBe(true)
    expect(bundle.useEditorCompositeAvatar).toBe(true)
    expect(getUseEditorCompositeAvatar('wood_tower')).toBe(true)
    expect(getUseEditorCompositeAvatar('air_boat')).toBe(true)
    expect(getUseEditorCompositeAvatar('warrior')).toBe(false)
    expect(bundle.tintBotSide).toBe(true)
    expect(bundle.player.idle.sheet.path).toContain('Pirate Tower_Ground.png')
    expect(existsSync(resolve(PUBLIC, def.path))).toBe(true)
  })

  it('goblin barrel uses hop and break clips from the 4×4 barrel sheet', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'goblin_barrel')!
    expect(cardAvatarKey('goblin_barrel')).toBe('avatar_goblin_barrel')
    expect(cardAvatarKey('goblin_barrel')).not.toBe('barrel_yellow')
    expect(getCardAvatarDef('goblin_barrel').path).toContain('Barrel_Yellow.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('goblin_barrel').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('Barrel_')
      expect(side.idle.sheet.frameWidth).toBe(128)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
    }
    expect(bundle.player.idle.start).toBe(0)
    expect(bundle.player.idle.end).toBe(0)
    expect(bundle.player.run.start).toBe(1)
    expect(bundle.player.run.end).toBe(7)
    expect(bundle.player.attack.start).toBe(12)
    expect(bundle.player.attack.end).toBe(14)
    expect(bundle.player.attack.repeat).toBe(0)
  })

  it('goblin demolisher uses Factions TNT sheets and dynamite projectile', () => {
    const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === 'goblin_demolisher')!
    expect(cardAvatarKey('goblin_demolisher')).toBe('avatar_goblin_demolisher')
    expect(getCardAvatarDef('goblin_demolisher').path).toContain('TNT_Blue.png')
    expect(existsSync(resolve(PUBLIC, getCardAvatarDef('goblin_demolisher').path))).toBe(true)
    for (const side of [bundle.player, bundle.bot] as const) {
      expect(side.idle.sheet.path).toContain('TNT_')
      expect(side.idle.sheet.frameWidth).toBe(192)
      expect(existsSync(resolve(PUBLIC, side.idle.sheet.path))).toBe(true)
    }
    expect(bundle.player.run.frames).toEqual([0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12])
    expect(bundle.player.attack.start).toBe(14)
    expect(bundle.player.attack.end).toBe(20)
    expect(existsSync(resolve(PUBLIC, GOBLIN_DYNAMITE_SHEET.path))).toBe(true)
  })

  it('loads generic explosion spritesheet from Effects/Explosion', () => {
    expect(existsSync(resolve(PUBLIC, EXPLOSION_SHEET.path))).toBe(true)
    expect(EXPLOSION_SHEET.frameEnd).toBe(8)
    expect(EXPLOSION_SHEET.animKey).toBe('fx_explosion_anim')
  })
})
