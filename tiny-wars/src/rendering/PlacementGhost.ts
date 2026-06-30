import Phaser from 'phaser'
import type { CardDefinition } from '@core/types'
import { CardType, Owner } from '@core/types'
import { troopDeployPositions } from '@core/DeploySystem'
import { CARD_DEFINITIONS } from '@data/CardData'
import { GAME_HEIGHT, CELL_SIZE, TROOP_DEPLOY_SPREAD_CELLS } from '@data/GameConstants'
import { getSideAssets } from '@data/AssetManifest'
import { playCardAnim } from './AnimationRegistry'
import { resolveTexture } from './renderingUtils'
import { applyCardDisplaySize, buildingPlacementCombatRadiusPx } from './assetDisplaySize'
import { AIR_BOAT_SPRITE_ORIGIN_Y } from './AirBoatCrew'

const VALID_TINT   = 0x88ff88
const INVALID_TINT = 0xff6666

export class PlacementGhost {
  private readonly troopSprites: Phaser.GameObjects.Sprite[] = []
  private readonly ring: Phaser.GameObjects.Arc
  private isSpell = false
  /** Buildings spawn cell-snapped (footprint aligns to grid), so preview snaps too. */
  private isBuilding = false
  private spellCardId: string | null = null
  /** Troop sprites shown in the preview (deploy count or spell spawn count). */
  private troopPreviewCount = 1
  /** Card id used for troop texture / display size (may differ from selected card). */
  private troopPreviewCardId: string | null = null

  constructor(private scene: Phaser.Scene) {
    this.ring = scene.add.circle(0, 0, 40, 0xff6622, 0.12)
      .setStrokeStyle(2, 0xff8844, 0.55)
      .setDepth(6)
      .setVisible(false)
  }

  private ensureTroopSprite(index: number): Phaser.GameObjects.Sprite {
    while (this.troopSprites.length <= index) {
      this.troopSprites.push(
        this.scene.add.sprite(0, 0, 'placeholder_player', 0)
          .setAlpha(0.55)
          .setDepth(6)
          .setVisible(false),
      )
    }
    return this.troopSprites[index]
  }

  private configureTroopSprites(cardId: string, textureKey: string, count: number): void {
    this.troopPreviewCount = count
    this.troopPreviewCardId = cardId

    for (let i = 0; i < count; i++) {
      const sprite = this.ensureTroopSprite(i)
      sprite.anims.stop()
      sprite.setOrigin(0.5, 0.5)
      const key = resolveTexture(this.scene, textureKey, 'placeholder_player')
      sprite.setTexture(key, 0)
      applyCardDisplaySize(sprite, this.scene, cardId, key, 0)
      if (cardId === 'air_boat') sprite.setOrigin(0.5, AIR_BOAT_SPRITE_ORIGIN_Y)
      sprite.setAlpha(0.55)
      sprite.clearTint()
    }

    for (let i = count; i < this.troopSprites.length; i++) {
      this.troopSprites[i].setVisible(false)
      this.troopSprites[i].anims.stop()
    }
  }

  setCard(card: CardDefinition): void {
    this.isSpell = card.cardType === CardType.SPELL
    this.isBuilding = card.cardType === CardType.BUILDING
    this.spellCardId = this.isSpell ? card.id : null

    if (this.isSpell) {
      const stats = card.spellStats!
      this.ring.setRadius(stats.radius * CELL_SIZE)

      if (card.id === 'tnt') {
        const side = getSideAssets('tnt', Owner.PLAYER)!
        const key = resolveTexture(this.scene, side.idle.sheet.key, 'placeholder_player')
        const sprite = this.ensureTroopSprite(0)
        sprite.setOrigin(0.5, 0.5)
        sprite.setTexture(key, 0)
        applyCardDisplaySize(sprite, this.scene, 'tnt', key, 0)
        sprite.setScale(sprite.scaleX * 0.5, sprite.scaleY * 0.5)
        sprite.setAlpha(0.75)
        sprite.clearTint()
        playCardAnim(sprite, this.scene, 'tnt', Owner.PLAYER, 'idle', -1)
        this.troopPreviewCount = 1
        this.troopPreviewCardId = 'tnt'
        for (let i = 1; i < this.troopSprites.length; i++) {
          this.troopSprites[i].setVisible(false)
          this.troopSprites[i].anims.stop()
        }
      } else if (stats.spawnCardId) {
        const spawnCardId = stats.spawnCardId
        const spawnCard = CARD_DEFINITIONS[spawnCardId]
        const textureKey = spawnCard?.textureKeyPlayer ?? card.textureKeyPlayer
        const count = stats.spawnCount ?? spawnCard?.deployCount ?? 1
        this.configureTroopSprites(spawnCardId, textureKey, count)
      } else {
        for (const sprite of this.troopSprites) {
          sprite.setVisible(false)
          sprite.anims.stop()
        }
        this.troopPreviewCount = 0
        this.troopPreviewCardId = null
      }
      return
    }

    if (this.isBuilding) {
      const side = getSideAssets(card.id, Owner.PLAYER)
      const textureKey = side?.idle.sheet.key ?? card.textureKeyPlayer
      const key = resolveTexture(this.scene, textureKey, 'placeholder_player')
      const sprite = this.ensureTroopSprite(0)
      sprite.anims.stop()
      sprite.setTexture(key, 0)
      applyCardDisplaySize(sprite, this.scene, card.id, key, 0)
      sprite.setOrigin(0.5, 0.5)
      sprite.setAlpha(0.45)
      sprite.clearTint()
      this.ring.setRadius(buildingPlacementCombatRadiusPx(card.id))
      this.troopPreviewCount = 0
      this.troopPreviewCardId = null
      for (let i = 1; i < this.troopSprites.length; i++) {
        this.troopSprites[i].setVisible(false)
        this.troopSprites[i].anims.stop()
      }
      return
    }

    const count = card.deployCount ?? 1
    this.configureTroopSprites(card.id, card.textureKeyPlayer, count)
  }

  show(): void {
    if (this.isSpell) {
      this.ring.setVisible(true)
      if (this.spellCardId === 'tnt') {
        this.ensureTroopSprite(0).setVisible(true)
      } else if (this.troopPreviewCount > 0) {
        for (let i = 0; i < this.troopPreviewCount; i++) {
          this.ensureTroopSprite(i).setVisible(true)
        }
      }
      return
    }

    if (this.isBuilding) {
      this.ring.setVisible(true)
      this.ensureTroopSprite(0).setVisible(true)
      return
    }

    for (let i = 0; i < this.troopPreviewCount; i++) {
      this.ensureTroopSprite(i).setVisible(true)
    }
  }

  hide(): void {
    for (const sprite of this.troopSprites) {
      sprite.setVisible(false)
      sprite.anims.stop()
    }
    this.ring.setVisible(false)
  }

  private positionTroopCluster(centerX: number, centerY: number, valid: boolean): void {
    if (this.troopPreviewCount <= 0 || !this.troopPreviewCardId) return

    const tint = valid ? VALID_TINT : INVALID_TINT
    const positions = troopDeployPositions(
      { x: centerX, y: centerY },
      this.troopPreviewCount,
      TROOP_DEPLOY_SPREAD_CELLS,
    )

    for (let i = 0; i < this.troopPreviewCount; i++) {
      const sprite = this.ensureTroopSprite(i)
      sprite.setVisible(true)
      sprite.setPosition(positions[i].x, positions[i].y)
      sprite.setTint(this.spellCardId === 'tnt' ? (valid ? 0xffffff : 0xffaaaa) : tint)
    }
  }

  update(pointerX: number, pointerY: number, valid: boolean): void {
    if (pointerY >= GAME_HEIGHT) {
      this.hide()
      return
    }

    const world = { x: pointerX, y: pointerY }

    if (this.isSpell) {
      this.ring.setVisible(true)
      this.ring.setPosition(world.x, world.y)
      this.ring.setFillStyle(valid ? 0xff6622 : 0xff2222, valid ? 0.14 : 0.1)
      this.ring.setStrokeStyle(2, valid ? 0xff8844 : 0xff4444, valid ? 0.6 : 0.45)

      if (this.spellCardId === 'tnt') {
        const sprite = this.ensureTroopSprite(0)
        sprite.setVisible(true)
        sprite.setPosition(world.x, world.y - 8)
        sprite.setTint(valid ? 0xffffff : 0xffaaaa)
      } else if (this.spellCardId === 'arrows') {
        for (const sprite of this.troopSprites) sprite.setVisible(false)
      } else if (this.troopPreviewCount > 0) {
        this.positionTroopCluster(world.x, world.y, valid)
      }
      return
    }

    if (this.isBuilding) {
      this.ring.setVisible(true)
      this.ring.setPosition(world.x, world.y)
      this.ring.setFillStyle(valid ? VALID_TINT : INVALID_TINT, valid ? 0.14 : 0.1)
      this.ring.setStrokeStyle(2, valid ? VALID_TINT : INVALID_TINT, valid ? 0.6 : 0.45)
      const sprite = this.ensureTroopSprite(0)
      sprite.setVisible(true)
      sprite.setPosition(world.x, world.y)
      sprite.clearTint()
      return
    }

    this.positionTroopCluster(world.x, world.y, valid)
  }
}
